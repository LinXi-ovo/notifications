<template>
  <div class="mermaid-block group relative my-4 border border-gray-200 rounded-lg overflow-hidden">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
      <span>📊 Mermaid 流程图</span>
      <div class="flex gap-1">
        <button
          class="px-2 py-0.5 rounded cursor-pointer border-none text-xs"
          :class="editing ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-200'"
          @mousedown.prevent
          @click="toggleEdit"
        >
          {{ editing ? '✅ 预览' : '✏️ 编辑' }}
        </button>
        <button
          class="px-2 py-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer border-none text-xs"
          @mousedown.prevent
          @click="remove"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- 编辑模式：直接粘贴代码 -->
    <textarea
      v-if="editing"
      v-model="code"
      class="w-full p-3 font-mono text-sm border-none resize-none focus:outline-none"
      rows="5"
      spellcheck="false"
      placeholder="粘贴 Mermaid 代码..."
    ></textarea>

    <!-- 预览模式 -->
    <div v-else class="p-4 min-h-[60px] flex items-center justify-center overflow-x-auto">
      <div v-if="renderError" class="text-xs text-red-500 text-center w-full">
        <p class="mb-1">⚠️ 渲染失败</p>
        <pre class="text-left p-2 bg-red-50 rounded text-xs whitespace-pre-wrap">{{ renderError }}</pre>
      </div>
      <div v-else-if="rendering" class="text-xs text-gray-400">⏳ 渲染中...</div>
      <div ref="svgContainer" class="w-full flex items-center justify-center"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { inject } from 'vue'

const nodeProps = inject('nodeViewProps')
const updateAttributes = nodeProps?.updateAttributes
const deleteNode = nodeProps?.deleteNode
const node = nodeProps?.node

const svgContainer = ref(null)
const editing = ref(true) // 默认编辑模式，用户粘贴后点预览
const rendering = ref(false)
const renderError = ref('')
const code = ref(node?.attrs?.code || '')

let debounceTimer = null

function cleanCode(raw) {
  return raw.replace(/^```(?:mermaid)?\s*/gm, '').replace(/```\s*$/gm, '').trim()
}

async function renderDiagram() {
  const c = cleanCode(code.value)
  if (!svgContainer.value || !c) return
  rendering.value = true
  renderError.value = ''

  try {
    const mermaid = await import('mermaid')
    const api = mermaid.default || mermaid
    api.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

    svgContainer.value.innerHTML = ''
    const id = `mv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { svg } = await api.render(id, c)

    svgContainer.value.innerHTML = svg
    const svgEl = svgContainer.value.querySelector('svg')
    if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
  } catch (e) {
    renderError.value = e.message || String(e)
    svgContainer.value.innerHTML = ''
  } finally {
    rendering.value = false
  }
}

function toggleEdit() {
  if (editing.value) {
    // 切换到预览：保存代码 + 渲染
    updateAttributes?.({ code: code.value })
    nextTick(() => renderDiagram())
  }
  editing.value = !editing.value
}

function remove() {
  deleteNode?.()
}

onMounted(() => {
  // 如果有代码，首次自动渲染（从 HTML 加载的场景）
  if (cleanCode(code.value)) {
    editing.value = false
    nextTick(() => renderDiagram())
  }
})

onBeforeUnmount(() => {
  svgContainer.value = null
  clearTimeout(debounceTimer)
})
</script>
