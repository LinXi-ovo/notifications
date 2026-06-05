<template>
  <div class="mermaid-block group relative my-4 border border-gray-200 rounded-lg overflow-hidden" :class="{ 'ring-2 ring-blue-400': editing }">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
      <span>📊 Mermaid 流程图</span>
      <div class="flex gap-1">
        <button
          class="px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer border-none text-xs"
          :class="editing ? 'bg-blue-100 text-blue-600' : 'text-gray-500'"
          @click="editing = !editing"
        >
          {{ editing ? '✅ 完成' : '✏️ 编辑' }}
        </button>
        <button
          class="px-2 py-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer border-none text-xs"
          @click="remove"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- 编辑模式 -->
    <textarea
      v-if="editing"
      v-model="code"
      @input="onCodeChange"
      class="w-full p-3 font-mono text-sm border-none resize-none focus:outline-none"
      rows="6"
      spellcheck="false"
    ></textarea>

    <!-- 预览模式 -->
    <div v-else ref="previewRef" class="mermaid-preview p-4 min-h-[60px] flex items-center justify-center overflow-x-auto">
      <div v-if="renderError" class="text-xs text-red-500 text-center">
        <p>⚠️ 渲染失败</p>
        <pre class="text-left mt-1 p-2 bg-red-50 rounded text-xs">{{ renderError }}</pre>
      </div>
      <div v-else-if="rendering" class="text-xs text-gray-400">⏳ 渲染中...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, inject } from 'vue'

const nodeProps = inject('nodeViewProps')
const editor = nodeProps?.editor
const node = nodeProps?.node
const updateAttributes = nodeProps?.updateAttributes
const deleteNode = nodeProps?.deleteNode

const code = ref(node.value?.attrs?.code || '')
const editing = ref(false)
const previewRef = ref(null)
const rendering = ref(false)
const renderError = ref('')

let debounceTimer = null

async function renderDiagram() {
  if (!previewRef.value || !code.value.trim()) return
  rendering.value = true
  renderError.value = ''

  try {
    const mermaid = await import('mermaid')
    const mermaidApi = mermaid.default || mermaid

    mermaidApi.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    })

    // 清空之前的渲染内容
    previewRef.value.innerHTML = ''

    // 给每个图表唯一 ID
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const svg = await mermaidApi.renderAsync(id, code.value)
    previewRef.value.innerHTML = svg.svg

    // 让 SVG 自适应宽度
    const svgEl = previewRef.value.querySelector('svg')
    if (svgEl) {
      svgEl.style.maxWidth = '100%'
      svgEl.style.height = 'auto'
    }
  } catch (e) {
    console.error('Mermaid 渲染失败:', e)
    renderError.value = e.message || String(e)
  } finally {
    rendering.value = false
  }
}

function onCodeChange() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updateAttributes?.({ code: code.value })
    renderDiagram()
  }, 500)
}

function remove() {
  deleteNode?.()
}

watch(editing, (v) => {
  if (!v && previewRef.value) {
    nextTick(() => renderDiagram())
  }
})

onMounted(() => {
  if (!editing.value) nextTick(() => renderDiagram())
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
})
</script>
