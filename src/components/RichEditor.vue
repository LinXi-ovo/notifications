<template>
  <div class="border border-gray-300 rounded-lg overflow-hidden bg-white" :class="{ 'ring-2 ring-blue-400': focused }">
    <!-- 工具栏 -->
    <Toolbar
      :editor="editor"
      :showSource="showSource"
      @toggle-source="toggleSource"
      @insert-image="insertImage"
      @insert-audio="insertAudio"
      @insert-video="insertVideo"
      @insert-file="insertFile"
      @insert-link="insertLink"
    />

    <!-- 编辑器 / HTML 源码 -->
    <div v-show="!showSource" ref="editorRef" class="px-4 py-3 min-h-[200px] prose prose-sm max-w-none"></div>

    <textarea
      v-show="showSource"
      :value="sourceContent"
      @input="onSourceInput"
      class="w-full px-4 py-3 min-h-[200px] font-mono text-sm border-none resize-none focus:outline-none"
    ></textarea>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      class="hidden"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditor } from '@tiptap/vue-3'
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

const editorRef = ref(null)
const fileInput = ref(null)
const showSource = ref(false)
const sourceContent = ref('')
const focused = ref(false)
const pendingFileType = ref('image')

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
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
    // 粘贴 / 拖入文件处理
    editor.view.dom.addEventListener('paste', handlePaste)
    editor.view.dom.addEventListener('drop', handleDrop)
  }
})

// 同步外部内容变化
watch(() => props.modelValue, (val) => {
  if (editor.value && !showSource.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val || '')
  }
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.view.dom.removeEventListener('paste', handlePaste)
    editor.value.view.dom.removeEventListener('drop', handleDrop)
    editor.value.destroy()
  }
})

function handlePaste(event) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) uploadMedia(file, 'image')
      return
    }
  }
}

function handleDrop(event) {
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  event.preventDefault()

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      uploadMedia(file, 'image')
    } else if (file.type.startsWith('audio/')) {
      uploadMedia(file, 'audio')
    } else if (file.type.startsWith('video/')) {
      uploadMedia(file, 'video')
    } else {
      uploadMedia(file, 'file')
    }
  }
}

function insertImage() {
  pendingFileType.value = 'image'
  fileInput.value?.click()
}

function insertAudio() {
  pendingFileType.value = 'audio'
  fileInput.value?.click()
}

function insertVideo() {
  pendingFileType.value = 'video'
  fileInput.value?.click()
}

function insertFile() {
  pendingFileType.value = 'file'
  fileInput.value?.click()
}

function insertLink() {
  const url = prompt('请输入链接地址：')
  if (url && editor.value) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

function onFileSelected(event) {
  const file = event.target?.files?.[0]
  if (!file) return
  uploadMedia(file, pendingFileType.value)
  fileInput.value.value = ''
}

async function uploadMedia(file, type) {
  const ed = editor.value
  if (!ed) return

  try {
    const bmobFile = new Bmob.File(file.name, file)
    const result = await bmobFile.save()
    const url = result.url

    if (type === 'image') {
      ed.chain().focus().setImage({ src: url }).run()
    } else if (type === 'audio') {
      ed.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: url } }], text: `🔊 ${file.name}` }]
      }).run()
      // 后续可优化为自定义音频节点
    } else if (type === 'video') {
      ed.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: url } }], text: `🎬 ${file.name}` }]
      }).run()
    } else {
      ed.chain().focus().insertContent({
        type: 'paragraph',
        content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: url } }], text: `📎 ${file.name}` }]
      }).run()
    }
  } catch (e) {
    console.error('上传失败:', e)
    alert('上传失败: ' + (e.message || e))
  }
}

function toggleSource() {
  if (showSource.value) {
    // 切回可视化：将源码写回编辑器
    showSource.value = false
    if (editor.value) {
      editor.value.commands.setContent(sourceContent.value || '')
    }
  } else {
    // 切到源码：从编辑器取出 HTML
    sourceContent.value = editor.value?.getHTML() || ''
    showSource.value = true
  }
}

function onSourceInput(e) {
  sourceContent.value = e.target.value
  emit('update:modelValue', sourceContent.value)
}
</script>
