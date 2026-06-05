<template>
  <div class="mermaid-block group relative my-4 border border-gray-200 rounded-lg overflow-hidden">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
      <span>📊 Mermaid 流程图</span>
      <button
        class="px-2 py-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer border-none text-xs"
        @mousedown.prevent
        @click="remove"
      >
        🗑️ 删除
      </button>
    </div>

    <!-- 渲染区域 -->
    <div class="p-4 min-h-[60px] flex items-center justify-center overflow-x-auto">
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { inject } from 'vue'

const nodeProps = inject('nodeViewProps')
const updateAttributes = nodeProps?.updateAttributes
const deleteNode = nodeProps?.deleteNode
const node = nodeProps?.node

const svgContainer = ref(null)
const rendering = ref(false)
const renderError = ref('')
const code = ref(node?.attrs?.code || '')

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
    const mermaidApi = mermaid.default || mermaid
    mermaidApi.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

    svgContainer.value.innerHTML = ''
    const id = `mv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { svg } = await mermaidApi.renderAsync(id, c)

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

function remove() {
  deleteNode?.()
}

onMounted(() => renderDiagram())
onBeforeUnmount(() => { svgContainer.value = null })
</script>
