<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="close">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col" style="height: 75vh;">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 class="text-lg font-bold text-gray-800 m-0">📊 插入 Mermaid 流程图</h3>
          <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl" @click="close">✕</button>
        </div>

        <!-- 内容 -->
        <div class="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0 overflow-hidden" style="height: calc(75vh - 120px);">
          <!-- 左侧：代码编辑 -->
          <div class="flex flex-col min-h-0">
            <label class="text-xs text-gray-500 mb-1 shrink-0">Mermaid 代码</label>
            <textarea
              v-model="code"
              class="flex-1 w-full p-3 font-mono text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[200px]"
              spellcheck="false"
              placeholder="输入 Mermaid 代码...&#10;例如:&#10;graph TD&#10;  A[开始] --> B[结束]"
            ></textarea>
            <div class="mt-2 text-xs text-gray-400 shrink-0">
              支持：流程图、时序图、甘特图、类图、饼图等
              <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" class="text-blue-500 ml-1">查看语法 →</a>
            </div>
          </div>

          <!-- 右侧：实时预览 -->
          <div class="flex flex-col min-h-0">
            <label class="text-xs text-gray-500 mb-1 shrink-0">实时预览</label>
            <div class="flex-1 border border-gray-200 rounded bg-white overflow-auto p-4 flex items-center justify-center" style="min-height: 200px;">
              <!-- 状态提示（不被 innerHTML 清掉） -->
              <div v-if="!code.trim()" class="text-gray-300 text-sm">输入代码后自动预览</div>
              <div v-else-if="rendering" class="text-gray-400 text-sm">⏳ 渲染中...</div>
              <div v-else-if="error" class="text-red-500 text-xs w-full text-center">
                <p class="font-medium mb-1">⚠️ 渲染失败，请检查 Mermaid 语法</p>
                <pre class="whitespace-pre-wrap bg-red-50 p-2 rounded text-left">{{ error }}</pre>
              </div>
              <!-- SVG 渲染容器（独立 ref，不混用 Vue 模板） -->
              <div ref="svgContainer" class="w-full flex items-center justify-center"></div>
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
const svgContainer = ref(null)
const rendering = ref(false)
const error = ref('')

let debounceTimer = null

// 剥离 ```mermaid 和 ``` 代码块标记，用户从 AI 复制可直接粘贴
function cleanCode(raw) {
  return raw.replace(/^```(?:mermaid)?\s*/gm, '').replace(/```\s*$/gm, '').trim()
}

async function renderPreview() {
  const c = cleanCode(code.value)
  if (!svgContainer.value || !c) return
  rendering.value = true
  error.value = ''

  try {
    const mermaid = await import('mermaid')
    const mermaidApi = mermaid.default || mermaid
    mermaidApi.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

    // 只清 SVG 容器，不影响外层的 Vue 条件渲染
    svgContainer.value.innerHTML = ''
    const id = `md-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { svg } = await mermaidApi.render(id, c)

    svgContainer.value.innerHTML = svg
    const svgEl = svgContainer.value.querySelector('svg')
    if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
  } catch (e) {
    error.value = e.message || String(e)
    svgContainer.value.innerHTML = ''
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
  emit('insert', cleanCode(code.value))
}

function close() {
  emit('close')
}

onBeforeUnmount(() => { clearTimeout(debounceTimer); svgContainer.value = null })
</script>
