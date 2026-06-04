<template>
  <div class="border border-gray-300 rounded-lg overflow-hidden bg-white" :class="{ 'ring-2 ring-blue-400': focused }">
    <!-- 工具栏 -->
    <Toolbar
      :editor="editor"
      :showSource="showSource"
      @toggle-source="toggleSource"
      @insert-image="pickFile('image')"
      @insert-audio="pickFile('audio')"
      @insert-video="pickFile('video')"
      @insert-file="pickFile('file')"
      @insert-link="insertLink"
    />

    <!-- 编辑器 -->
    <div v-show="!showSource" class="px-4 py-3 min-h-[200px] prose prose-sm max-w-none" @click="focusEditor">
      <EditorContent :editor="editor" />
    </div>

    <!-- HTML 源码 -->
    <textarea
      v-show="showSource"
      v-model="sourceContent"
      @input="onSourceInput"
      class="w-full px-4 py-3 min-h-[200px] font-mono text-sm border-none resize-none focus:outline-none"
    ></textarea>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInput" type="file" class="hidden" @change="onFileSelected" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Bmob from '@/api/bmob'
import Toolbar from './RichEditor/Toolbar.vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const showSource = ref(false)
const sourceContent = ref('')
const focused = ref(false)
let pendingType = 'image'

// ── 编辑器 ──
const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    ImageExt.configure({ inline: false }),
    LinkExt.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: '开始编辑通知内容...' }),
  ],
  onUpdate: ({ editor }) => {
    if (!showSource.value) {
      emit('update:modelValue', editor.getHTML())
    }
  },
  onFocus: () => { focused.value = true },
  onBlur: () => { focused.value = false },
  onCreate: ({ editor }) => {
    editor.view.dom.addEventListener('paste', handlePaste)
    editor.view.dom.addEventListener('drop', handleDrop)
  }
})

// 外部内容变化同步到编辑器
watch(() => props.modelValue, (val) => {
  if (!editor.value || showSource.value) return
  const current = editor.value.getHTML()
  const incoming = val || ''
  if (incoming !== current && incoming !== sourceContent.value) {
    editor.value.commands.setContent(incoming, false)
  }
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.view.dom.removeEventListener('paste', handlePaste)
    editor.value.view.dom.removeEventListener('drop', handleDrop)
    editor.value.destroy()
  }
})

function focusEditor() {
  editor.value?.chain().focus().run()
}

// ── 粘贴 / 拖入 ──
function handlePaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) doUpload(file, 'image')
      return
    }
  }
}

function handleDrop(e) {
  const files = e.dataTransfer?.files
  if (!files?.length) return
  e.preventDefault()
  for (const file of files) {
    if (file.type.startsWith('image/')) doUpload(file, 'image')
    else if (file.type.startsWith('audio/')) doUpload(file, 'audio')
    else if (file.type.startsWith('video/')) doUpload(file, 'video')
    else doUpload(file, 'file')
  }
}

// ── 上传文件 ──
async function doUpload(file, type) {
  const ed = editor.value
  if (!ed) return
  try {
    // Bmob v3 File.save() 返回数组 ["url"]
    const bmobFile = Bmob.File(file.name, file)
    const result = await bmobFile.save()
    const url = Array.isArray(result) ? result[0] : (result.url || result)

    if (type === 'image') {
      ed.chain().focus().setImage({ src: url }).run()
    } else {
      const label = type === 'audio' ? '🔊' : type === 'video' ? '🎬' : '📎'
      ed.chain().focus().insertContent(`<p><a href="${url}" target="_blank">${label} ${file.name}</a></p>`).run()
    }
  } catch (e) {
    console.error('上传失败:', e)
    // Bmob 文件域名未配置时提示具体信息
    const msg = e.error || e.message || JSON.stringify(e)
    alert('上传失败: ' + msg)
  }
}

// ── 工具栏操作 ──
function pickFile(type) {
  pendingType = type
  // 设置 accept 属性
  const acceptMap = {
    image: 'image/*',
    audio: 'audio/*',
    video: 'video/*',
    file: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar'
  }
  fileInput.value.accept = acceptMap[type] || '*/*'
  fileInput.value.value = ''
  fileInput.value?.click()
}

function onFileSelected(e) {
  const file = e.target?.files?.[0]
  if (file) doUpload(file, pendingType)
}

function insertLink() {
  const url = prompt('请输入链接地址：')
  if (url && editor.value) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

function toggleSource() {
  showSource.value = !showSource.value
  if (showSource.value) {
    // 切到源码：取当前 HTML
    sourceContent.value = editor.value?.getHTML() || ''
  } else {
    // 切回可视化：把源码写回编辑器（暂时禁用 onUpdate 防循环）
    nextTick(() => {
      if (editor.value) {
        editor.value.commands.setContent(sourceContent.value || '<p></p>', false)
        emit('update:modelValue', editor.value.getHTML())
      }
    })
  }
}

function onSourceInput() {
  emit('update:modelValue', sourceContent.value)
}
</script>
