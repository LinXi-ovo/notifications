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
      @insert-link="handleInsertLink"
@insert-mermaid="insertMermaid"
    />

    <!-- 链接按钮直接用 prompt，不涉及 Vue 组件，零副作用 -->
    <!-- Tiptap 官方 useLinkHandler 也是同样的 prompt 模式 -->

    <!-- 编辑器 -->
    <div v-show="!showSource" class="px-4 py-3 min-h-[200px] prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800" @click="focusEditor">
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

    <!-- Mermaid 对话框 -->
    <MermaidDialog
      :visible="showMermaidDialog"
      @close="showMermaidDialog = false"
      @insert="handleMermaidInsert"
    />
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
import Toolbar from './RichEditor/Toolbar.vue'
import { MermaidNode } from './RichEditor/MermaidNode.js'
import MermaidDialog from './RichEditor/MermaidDialog.vue'
import { uploadFile } from '@/api/cos'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const showSource = ref(false)
const sourceContent = ref('')
const focused = ref(false)
const showMermaidDialog = ref(false)
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
    MermaidNode,
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
    if (item.type === 'application/pdf' || item.type.includes('spreadsheet') || item.type.includes('sheet')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) doUpload(file, 'file')
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

// ── 上传文件到腾讯云 COS ──
async function doUpload(file, type) {
  const ed = editor.value
  if (!ed) return

  // 文件大小限制（COS 限制 5GB，前端设 50MB 做保护）
  if (file.size > 50 * 1024 * 1024) {
    alert('文件过大（>50MB），请压缩后重试。')
    return
  }

  const uploadingMsg = '⏳ 上传中...'
  try {
    // 图片上传前先压缩，节省 COS 存储
    let fileToUpload
    if (type === 'image') {
      try {
        const compressed = await compressImage(file)
        fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
      } catch {
        // 压缩失败时直接上传原图
        fileToUpload = file
      }
    } else {
      fileToUpload = file
    }

    const url = await uploadFile(fileToUpload)

    if (type === 'image') {
      ed.chain().focus().setImage({ src: url }).run()
    } else {
      const label = type === 'audio' ? '🔊' : type === 'video' ? '🎬' : '📎'
      if (type === 'audio') {
        ed.chain().focus().insertContent(
          `<p><audio controls src="${url}"></audio> ${file.name}</p>`
        ).run()
      } else if (type === 'video') {
        ed.chain().focus().insertContent(
          `<p><video controls src="${url}" style="max-width:100%;max-height:400px"></video> ${file.name}</p>`
        ).run()
      } else if (file.type === 'application/pdf') {
        ed.chain().focus().insertContent(
          `<p><a href="${url}" target="_blank" class="inline-flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg no-underline text-sm">📄 ${file.name} <span class="text-xs text-red-400">点击预览</span></a></p>`
        ).run()
      } else {
        ed.chain().focus().insertContent(
          `<p><a href="${url}" target="_blank">📎 ${file.name}</a></p>`
        ).run()
      }
    }
  } catch (e) {
    console.error('上传失败:', e)
    alert('上传失败: ' + (e.message || e))
  }
}

// 图片压缩：canvas 缩放到 1200px + JPEG 压缩
function compressImage(file, { maxWidth = 1200, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width))
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

// ── 链接插入：提示用户快捷键，浏览器原生行为最可靠 ──
function handleInsertLink() {
  alert('💡 选中文字后按 Ctrl+V 粘贴链接地址，浏览器会自动生成超链接。\n\n也可以直接输入链接文本，编辑器会自动识别。')
}

// ── 插入 Mermaid 流程图 ──
function insertMermaid() {
  showMermaidDialog.value = true
}

function handleMermaidInsert(code) {
  showMermaidDialog.value = false
  editor.value?.chain().focus().insertMermaid(code).run()
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
