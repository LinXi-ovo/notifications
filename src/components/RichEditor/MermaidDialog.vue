<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="close">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-bold text-gray-800 m-0">📊 插入 Mermaid 流程图</h3>
          <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl" @click="close">✕</button>
        </div>

        <!-- 内容 -->
        <div class="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0 overflow-hidden">
          <!-- 左侧：代码编辑 -->
          <div class="flex flex-col">
            <label class="text-xs text-gray-500 mb-1">Mermaid 代码</label>
            <textarea
              v-model="code"
              class="flex-1 w-full p-3 font-mono text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              spellcheck="false"
              placeholder="输入 Mermaid 代码...&#10;例如:&#10;graph TD&#10;  A[开始] --> B[结束]"
            ></textarea>
            <div class="mt-2 text-xs text-gray-400">
              支持：流程图、时序图、甘特图、类图、饼图等
              <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" class="text-blue-500 ml-1">查看语法 →</a>
            </div>
          </div>

          <!-- 右侧：实时预览 -->
          <div class="flex flex-col">
            <label class="text-xs text-gray-500 mb-1">实时预览</label>
            <div ref="previewRef" class="flex-1 border border-gray-200 rounded bg-white p-4 overflow-auto flex items-center justify-center">
              <div v-if="!code.trim()" class="text-gray-300 text-sm">输入代码后自动预览</div>
              <div v-else-if="rendering" class="text-gray-400 text-sm">⏳ 渲染中...</div>
              <div v-else-if="error" class="text-red-500 text-xs">
                <p class="font-medium mb-1">⚠️ 渲染失败</p>
                <pre class="whitespace-pre-wrap">{{ error }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button class="px-4 py-2 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer" @click="close">取消</button>
          <button
            class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer border-none disabled:opacity-50"
            :disabled="!code.trim()"
            @click="insert"
          >
            📥 插入
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'insert'])

const code = ref(`graph TD
  A[开始] --> B{判断}
  B -->|是| C[处理]
  B -->|否| D[结束]
  C --> D`)
const previewRef = ref(null)
const rendering = ref(false)
const error = ref('')

let debounceTimer = null

async function renderPreview() {
  if (!previewRef.value || !code.value.trim()) return
  rendering.value = true
  error.value = ''

  try {
    const mermaid = await import('mermaid')
    const mermaidApi = mermaid.default || mermaid
    mermaidApi.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

    previewRef.value.innerHTML = ''
    const id = `md-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { svg } = await mermaidApi.renderAsync(id, code.value)

    const wrapper = document.createElement('div')
    wrapper.innerHTML = svg
    wrapper.style.width = '100%'
    const svgEl = wrapper.querySelector('svg')
    if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
    previewRef.value.appendChild(wrapper)
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    rendering.value = false
  }
}

watch(code, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(renderPreview, 500)
})

watch(() => props.visible, (v) => {
  if (v) {
    code.value = `graph TD
  A[开始] --> B{判断}
  B -->|是| C[处理]
  B -->|否| D[结束]
  C --> D`
    error.value = ''
    nextTick(() => renderPreview())
  }
})

function insert() {
  emit('insert', code.value.trim())
}

function close() {
  emit('close')
}

onBeforeUnmount(() => clearTimeout(debounceTimer))
</script>
