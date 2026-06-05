<template>
  <div class="border border-gray-300 rounded-lg overflow-hidden bg-white" :class="{ 'ring-2 ring-blue-400': focused }">
    <!-- 编辑器模式 -->
    <div v-show="!showSource" class="wg-editor-area">
      <Toolbar
        :editor="editorRef"
        :defaultConfig="toolbarConfig"
        mode="default"
      />
      <Editor
        v-model="valueHtml"
        :defaultConfig="editorConfig"
        mode="default"
        @onCreated="handleCreated"
        @onChange="handleChange"
        @onFocus="handleFocus"
        @onBlur="handleBlur"
        @customPaste="handleCustomPaste"
      />
    </div>

    <!-- HTML 源码模式 -->
    <textarea
      v-show="showSource"
      v-model="sourceContent"
      @input="onSourceInput"
      class="w-full px-4 py-3 min-h-[200px] font-mono text-sm border-none resize-none focus:outline-none"
    ></textarea>

    <!-- 底栏 -->
    <div class="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 bg-gray-50">
      <span class="text-xs text-gray-400">wangEditor</span>
      <button
        type="button"
        @mousedown.prevent
        @click="toggleSource"
        class="text-xs text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer"
      >
        {{ showSource ? '👁️ 预览' : '🔧 源码' }}
      </button>
    </div>
  </div>

  <!-- Mermaid 管理器 -->
  <MermaidManager
    :visible="mermaidManagerVisible"
    :map="mermaidMap"
    @close="mermaidManagerVisible = false"
    @update:map="mermaidMap = $event"
  />
</template>

<script setup>
import { ref, shallowRef, watch, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

// ── 自定义菜单 & 元素类型（副作用：全局注册） ──
import './WgEditor/custom-menus.js'
import './WgEditor/mermaid-plugin.js'

// ── 数据分离工具 ──
import { parseMermaid, mergeMermaid } from '@/utils/mermaid-token'
import MermaidManager from '@/components/MermaidManager.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const editorRef = shallowRef(null)
const focused = ref(false)
const showSource = ref(false)
const sourceContent = ref('')

// Mermaid 数据层
const mermaidMap = ref({})
const mermaidManagerVisible = ref(false)

// 初始内容：parse 后传给编辑器
const parsed = parseMermaid(props.modelValue || '')
const valueHtml = ref(parsed.html)
mermaidMap.value = parsed.map

// ── Mermaid 粘贴检测关键词 ──
const MERMAID_KEYWORDS = [
  'graph ', 'sequenceDiagram', 'gantt', 'classDiagram', 'pie ',
  'mindmap', 'flowchart ', 'stateDiagram', 'erDiagram', 'journey ',
  'gitgraph', 'timeline', 'quadrantChart', 'sankey', 'xychart', 'block', 'c4Diagram',
]

// ── 同步外部 v-model ──
watch(() => props.modelValue, (val) => {
  const incoming = val || ''
  const currentRaw = mergeMermaid(valueHtml.value, { ...mermaidMap.value })
  if (incoming !== currentRaw) {
    const p = parseMermaid(incoming)
    valueHtml.value = p.html
    mermaidMap.value = p.map
  }
})

// ── 工具栏配置 ──
const toolbarConfig = {
  excludeKeys: [
    'fullScreen', 'emotion', 'todo', 'date', 'time',
    'subscript', 'superscript', 'letterSpacing',
  ],
  insertKeys: {
    index: 0,
    keys: ['insertMermaid', 'insertAudio', 'insertFile'],
  },
}

// ── 编辑器配置 ──
const editorConfig = {
  placeholder: '开始编辑通知内容...',
  MENU_CONF: {
    // ── 图片上传到 COS ──
    uploadImage: {
      async customUpload(file, insertFn) {
        try {
          const { uploadFile } = await import('@/api/cos')
          // 图片先压缩
          let fileToUpload = file
          try {
            const compressed = await compressImage(file)
            fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
            })
          } catch {
            // 压缩失败就用原图
          }
          const url = await uploadFile(fileToUpload)
          insertFn(url)
        } catch (e) {
          console.error('图片上传失败:', e)
        }
      },
    },
  },
}

// ── 编辑器生命周期 ──
function handleCreated(editor) {
  editorRef.value = editor
}

function handleChange(editor) {
  valueHtml.value = editor.getHtml()
  // 保存时合并 Mermaid 数据
  emit('update:modelValue', mergeMermaid(valueHtml.value, { ...mermaidMap.value }))
}

function handleFocus() {
  focused.value = true
}

function handleBlur() {
  focused.value = false
}

// ── 自定义粘贴：检测 Mermaid 代码 ──
function handleCustomPaste(editor, event, callback) {
  // 先检查图片粘贴
  const items = event.clipboardData?.items
  if (items) {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        callback(false)
        const file = item.getAsFile()
        if (file) doUploadImage(editor, file)
        return
      }
    }
  }

  // 检查 Mermaid 代码：自动存入 Map 并插入 Token
  const text = event.clipboardData?.getData('text/plain')
  if (text && isMermaidCode(text)) {
    event.preventDefault()
    callback(false)
    const code = text.trim()
    const id = 'mermaid_' + Math.random().toString(36).slice(2, 10)
    mermaidMap.value = { ...mermaidMap.value, [id]: code }
    editor.dangerouslyInsertHtml(`[[!${id}]]`)
    return
  }

  callback(true) // 放行默认粘贴
}

function isMermaidCode(text) {
  const firstLine = text.trim().split('\n')[0]
  return MERMAID_KEYWORDS.some(kw => firstLine.startsWith(kw))
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── 粘贴图片自动上传 ──
async function doUploadImage(editor, file) {
  if (file.size > 50 * 1024 * 1024) {
    editor.dangerouslyInsertHtml('<p>❌ 图片过大（>50MB）</p>')
    return
  }
  try {
    const { uploadFile } = await import('@/api/cos')
    let fileToUpload = file
    try {
      const compressed = await compressImage(file)
      fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
      })
    } catch { /* 用原图 */ }
    const url = await uploadFile(fileToUpload)
    editor.dangerouslyInsertHtml(`<p><img src="${url}" alt="${file.name}" /></p>`)
  } catch (e) {
    editor.dangerouslyInsertHtml(`<p>❌ 上传失败: ${e.message}</p>`)
  }
}

// ── 图片压缩 ──
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

// ── HTML 源码模式 ──
function toggleSource() {
  showSource.value = !showSource.value
  if (showSource.value) {
    sourceContent.value = editorRef.value?.getHtml() || ''
  } else {
    nextTick(() => {
      const editor = editorRef.value
      if (!editor) return
      editor.setHtml(sourceContent.value || '<p></p>')
      emit('update:modelValue', editor.getHtml())
    })
  }
}

function onSourceInput() {
  emit('update:modelValue', sourceContent.value)
}

// ── Mermaid 管理器 ──
function onMermaidInsert() {
  mermaidManagerVisible.value = true
}

onMounted(() => {
  window.addEventListener('wg-mermaid-insert', onMermaidInsert)
})

// ── 销毁 ──
onBeforeUnmount(() => {
  window.removeEventListener('wg-mermaid-insert', onMermaidInsert)
  if (editorRef.value) {
    editorRef.value.destroy()
    editorRef.value = null
  }
})
</script>

<style>
/* wangEditor 编辑器内容区域最小高度 */
.wg-editor-area .w-e-text-container {
  min-height: 200px !important;
}
</style>
