<template>
  <teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @mousedown.self="onBackdrop">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col relative">
        <!-- Toast -->
        <div v-if="toastMsg" class="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg">
          {{ toastMsg }}
        </div>

        <!-- 标题 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-bold text-gray-800 m-0">📊 Mermaid 管理</h3>
          <button type="button" class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl" @click="close">✕</button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <!-- 调试模式预设 -->
          <div v-if="debugMode" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-yellow-700">🧪 调试模式</span>
              <span class="text-xs text-yellow-500">仅管理员可见</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button v-for="p in presets" :key="p.label" type="button"
                class="px-3 py-1.5 text-xs bg-white border border-yellow-300 rounded hover:bg-yellow-100 cursor-pointer"
                @click="addPreset(p)"
              >＋ {{ p.label }}</button>
            </div>
          </div>

          <!-- 条目列表 -->
          <div v-if="entries.length === 0" class="text-center py-8 text-gray-400 text-sm">
            还没有 Mermaid 流程图，点击下方「新建」添加
          </div>

          <div v-for="(entry, i) in entries" :key="entry.id" class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800 truncate">{{ entry.displayTitle }}</div>
                <div class="text-xs text-gray-400 font-mono mt-0.5">{{ entry.id }}</div>
                <div class="mt-2 flex items-center gap-2">
                  <code class="text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer select-all hover:bg-gray-200" @click="copyToken(entry.id)">
                    [[!{{ entry.id }}]]
                  </code>
                  <button type="button" class="text-xs text-blue-500 bg-transparent border-none cursor-pointer hover:underline" @click="copyToken(entry.id)">复制</button>
                </div>
              </div>
              <div class="flex gap-1 shrink-0">
                <button type="button" class="px-2 py-1 text-xs text-blue-500 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border-none" @click="editEntry(i)">编辑</button>
                <button type="button" class="px-2 py-1 text-xs text-red-500 bg-red-50 rounded hover:bg-red-100 cursor-pointer border-none" @click="removeEntry(i)">删除</button>
              </div>
            </div>
          </div>

          <!-- 编辑区 -->
          <div v-if="showEditor" class="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div class="mb-2">
              <label class="text-xs text-gray-500">标题（留空自动取代码第一行）</label>
              <input v-model="editingTitle" class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mt-1" placeholder="通知处理流程图" />
            </div>
            <textarea
              v-model="editingCode"
              class="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none"
              rows="6"
              spellcheck="false"
              placeholder="粘贴 Mermaid 代码..."
            ></textarea>
            <!-- 预览 -->
            <div ref="previewRef" class="mt-2 min-h-[60px] p-3 bg-white rounded border border-gray-200 flex items-center justify-center overflow-x-auto">
              <div v-if="!editingCode.trim()" class="text-xs text-gray-400">输入代码后自动预览</div>
              <div v-else-if="previewLoading" class="text-xs text-gray-400">⏳ 渲染中...</div>
              <div v-else-if="previewError" class="text-xs text-red-500">{{ previewError }}</div>
            </div>
            <div class="flex justify-end gap-2 mt-3">
              <button type="button" class="px-3 py-1.5 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer" @click="cancelEdit">取消</button>
              <button type="button" class="px-3 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 cursor-pointer border-none" :disabled="!editingCode.trim()" @click="saveEdit">{{ editingIndex === -1 ? '添加' : '保存' }}</button>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <span class="text-xs text-gray-400">⚙️ 调试开关在「设置」页</span>
          <div class="flex gap-2">
            <button v-if="!showEditor" type="button" class="px-3 py-1.5 text-sm text-blue-500 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 cursor-pointer" @click="openNew">＋ 新建</button>
            <button type="button" class="px-3 py-1.5 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer" @click="close">完成</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { getTitle } from '@/utils/mermaid-token'

const props = defineProps({
  visible: { type: Boolean, default: false },
  map: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'update:map'])

const previewRef = ref(null)
const showEditor = ref(false)
const editingCode = ref('')
const editingTitle = ref('')
const editingIndex = ref(-1)
const previewLoading = ref(false)
const previewError = ref('')
const toastMsg = ref('')
const debugMode = ref(localStorage.getItem('mermaid-debug') === 'true')
let toastTimer = null

watch(debugMode, (v) => {
  localStorage.setItem('mermaid-debug', v ? 'true' : 'false')
})

// 预设
const presets = [
  { label: '流程图', code: 'graph TD\n  A[开始] --> B{判断}\n  B -->|是| C[处理]\n  B -->|否| D[结束]' },
  { label: '时序图', code: 'sequenceDiagram\n  A->>B: 请求\n  B-->>A: 响应' },
  { label: '甘特图', code: 'gantt\n  title 项目计划\n  dateFormat YYYY-MM-DD\n  section 阶段一\n  任务A :2026-06-01, 7d' },
  { label: '饼图', code: 'pie title 占比\n  "类型A" : 45\n  "类型B" : 30\n  "类型C" : 25' },
]

// 本地条目
const entries = ref([])

watch(() => props.visible, (val) => {
  if (val) rebuildEntries()
})
watch(() => props.map, () => {
  if (props.visible) rebuildEntries()
}, { deep: true })

function rebuildEntries() {
  entries.value = Object.entries(props.map).map(([id, entry]) => {
    const code = typeof entry === 'object' ? entry.code : entry
    const title = typeof entry === 'object' ? entry.title : ''
    return { id, code, title, displayTitle: getTitle(entry) }
  })
}

function showToast(msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 1500)
}

function copyToken(id) {
  navigator.clipboard?.writeText(`[[!${id}]]`).then(() => {
    showToast('✅ 已复制 [[!' + id + ']]')
  }).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = `[[!${id}]]`
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast('✅ 已复制')
  })
}

function addPreset(p) {
  const id = 'mermaid_' + Math.random().toString(36).slice(2, 10)
  const newMap = { ...props.map, [id]: { code: p.code, title: p.label } }
  emit('update:map', newMap)
  showToast('✅ 已添加「' + p.label + '」')
}

function openNew() {
  editingIndex.value = -1
  editingCode.value = ''
  editingTitle.value = ''
  showEditor.value = true
}

function editEntry(i) {
  editingIndex.value = i
  const entry = entries.value[i]
  editingCode.value = entry.code
  editingTitle.value = entry.title || ''
  showEditor.value = true
  nextTick(() => renderPreview())
}

function cancelEdit() {
  showEditor.value = false
  editingCode.value = ''
  editingTitle.value = ''
  editingIndex.value = -1
  previewError.value = ''
  previewLoading.value = false
}

function saveEdit() {
  if (!editingCode.value.trim()) return
  const code = editingCode.value.trim()
  const title = editingTitle.value.trim()
  const newMap = { ...props.map }

  if (editingIndex.value === -1) {
    const id = genId()
    newMap[id] = title ? { code, title } : { code }
  } else {
    const id = entries.value[editingIndex.value].id
    newMap[id] = title ? { code, title } : { code }
  }

  emit('update:map', newMap)
  showEditor.value = false
  editingCode.value = ''
  editingTitle.value = ''
  editingIndex.value = -1
}

import { genId } from '@/utils/mermaid-token'

function removeEntry(i) {
  const id = entries.value[i].id
  const newMap = { ...props.map }
  delete newMap[id]
  emit('update:map', newMap)
}

function onBackdrop() {
  if (window.getSelection()?.toString()) return
  close()
}

function close() {
  showEditor.value = false
  emit('close')
}

// 预览
async function renderPreview() {
  const c = editingCode.value.trim()
  if (!c) return
  previewLoading.value = true
  previewError.value = ''
  const container = previewRef.value
  if (!container) return
  container.querySelectorAll('svg').forEach(s => s.remove())

  const clean = c.replace(/^```(?:mermaid)?\s*/gm, '').replace(/```\s*$/gm, '').trim()
  if (!clean) { previewLoading.value = false; return }

  try {
    const mod = await import('mermaid')
    const api = mod.default || mod
    api.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    const { svg } = await api.render(`mm-${Date.now()}`, clean)
    if (svg.includes('error-icon') || svg.includes('error-text')) {
      previewError.value = 'Mermaid 语法错误'
    } else {
      container.innerHTML = svg
      const el = container.querySelector('svg')
      if (el) { el.style.maxWidth = '100%'; el.style.height = 'auto' }
    }
  } catch (e) {
    previewError.value = e.message || String(e)
    container.querySelectorAll('svg').forEach(s => s.remove())
  } finally {
    previewLoading.value = false
  }
}

watch(editingCode, () => {
  if (editingCode.value.trim()) nextTick(() => renderPreview())
})
</script>
