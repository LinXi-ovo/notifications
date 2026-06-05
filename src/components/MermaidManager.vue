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
          <!-- 条目列表 -->
          <div v-if="entries.length === 0" class="text-center py-8 text-gray-400 text-sm">
            还没有 Mermaid 流程图，点击下方「新建」添加
          </div>

          <div v-for="(entry, i) in entries" :key="entry.id" class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-400 font-mono mb-1">{{ entry.id }}</div>
                <div class="text-sm font-mono text-gray-700 truncate">{{ entry.firstLine }}</div>
                <div class="mt-2">
                  <code class="text-xs bg-gray-100 px-2 py-1 rounded select-all cursor-pointer" @click="copyToken(entry.id)">
                    [[!{{ entry.id }}]]
                  </code>
                  <span class="text-xs text-gray-400 ml-2">点击复制</span>
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
            <textarea
              v-model="editingCode"
              class="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none"
              rows="6"
              spellcheck="false"
              placeholder="粘贴 Mermaid 代码..."
            ></textarea>
            <!-- 实时预览 -->
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
          <p class="text-xs text-gray-400 m-0">复制 <code class="bg-gray-200 px-1 rounded">[[!mermaid_xxx]]</code> 后粘贴到编辑器中</p>
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

const props = defineProps({
  visible: { type: Boolean, default: false },
  map: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'update:map'])

const previewRef = ref(null)
const showEditor = ref(false)
const editingCode = ref('')
const editingIndex = ref(-1)
const previewLoading = ref(false)
const previewError = ref('')

// 本地拷贝
const entries = ref([])

watch(() => props.visible, (val) => {
  if (val) rebuildEntries()
})

watch(() => props.map, () => {
  if (props.visible) rebuildEntries()
}, { deep: true })

function rebuildEntries() {
  entries.value = Object.entries(props.map).map(([id, code]) => ({
    id,
    code,
    firstLine: (code.split('\n')[0] || '').trim() || 'Mermaid',
  }))
}

const toastMsg = ref('')
let toastTimer = null

function showToast(msg) {
  toastMsg.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 1500)
}

function copyToken(id) {
  navigator.clipboard?.writeText(`[[!${id}]]`).then(() => {
    showToast('✅ 已复制 [[!' + id + ']]')
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = `[[!${id}]]`
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast('✅ 已复制')
  })
}

function openNew() {
  editingIndex.value = -1
  editingCode.value = ''
  showEditor.value = true
}

function editEntry(i) {
  editingIndex.value = i
  editingCode.value = entries.value[i].code
  showEditor.value = true
  nextTick(() => renderPreview())
}

function cancelEdit() {
  showEditor.value = false
  editingCode.value = ''
  editingIndex.value = -1
  previewError.value = ''
  previewLoading.value = false
}

function saveEdit() {
  if (!editingCode.value.trim()) return
  const code = editingCode.value.trim()
  const newMap = { ...props.map }

  if (editingIndex.value === -1) {
    // 新建
    const id = 'mermaid_' + Math.random().toString(36).slice(2, 10)
    newMap[id] = code
  } else {
    // 编辑已有
    const id = entries.value[editingIndex.value].id
    newMap[id] = code
  }

  emit('update:map', newMap)
  showEditor.value = false
  editingCode.value = ''
  editingIndex.value = -1
}

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
    api.render(`mm-${Date.now()}`, clean).then(({ svg }) => {
      container.innerHTML += svg
      const el = container.querySelector('svg:last-child')
      if (el) { el.style.maxWidth = '100%'; el.style.height = 'auto' }
    })
  } catch (e) {
    previewError.value = e.message || String(e)
  } finally {
    previewLoading.value = false
  }
}

watch(editingCode, () => {
  if (editingCode.value.trim()) nextTick(() => renderPreview())
})
</script>
