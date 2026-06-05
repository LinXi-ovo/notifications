<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
      <!-- 顶部 -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <span class="text-sm text-gray-600 truncate">📄 {{ filename }}</span>
        <div class="flex items-center gap-3">
          <a
            :href="url"
            target="_blank"
            class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 no-underline cursor-pointer"
          >⬇ 下载</a>
          <button
            class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg"
            @click="close"
          >✕</button>
        </div>
      </div>

      <!-- 工具栏 -->
      <div v-if="state === 'loaded'" class="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
        <div class="flex items-center gap-2">
          <button
            class="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default cursor-pointer"
            :disabled="currentPage <= 1"
            @click="goPrev"
          >← 上一页</button>
          <span class="text-xs text-gray-500">
            <input
              type="number"
              :value="currentPage"
              :min="1"
              :max="totalPages"
              class="w-10 text-center text-xs border border-gray-200 rounded px-1 py-0.5"
              @change="goToPage($event.target.value)"
            /> / {{ totalPages }}
          </span>
          <button
            class="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default cursor-pointer"
            :disabled="currentPage >= totalPages"
            @click="goNext"
          >下一页 →</button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">{{ Math.round(scale * 100) }}%</span>
          <button
            class="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 cursor-pointer"
            @click="zoomOut"
          >−</button>
          <button
            class="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-100 cursor-pointer"
            @click="zoomIn"
          >＋</button>
        </div>
      </div>

      <!-- PDF 渲染区域 -->
      <div class="flex-1 bg-gray-100 overflow-auto flex flex-col items-center p-4 relative min-h-[300px]">
        <!-- 加载中 -->
        <div
          v-if="state === 'loading'"
          class="flex items-center justify-center py-20"
        >
          <div class="text-center">
            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p class="text-sm text-gray-400">正在渲染 PDF...</p>
          </div>
        </div>

        <!-- PDF canvas -->
        <canvas
          v-show="state === 'loaded'"
          ref="canvasRef"
          class="shadow-lg bg-white max-w-full"
          :style="{ width: canvasWidth + 'px' }"
        ></canvas>

        <!-- 加载失败 -->
        <div
          v-if="state === 'error'"
          class="flex items-center justify-center py-20"
        >
          <div class="text-center p-8 max-w-sm">
            <p class="text-4xl mb-2">❌</p>
            <p class="text-lg text-red-500 mb-2">PDF 加载失败</p>
            <p class="text-sm text-gray-500 mb-5">{{ errorMessage }}</p>
            <div class="flex items-center justify-center gap-3 flex-wrap">
              <a
                :href="url"
                target="_blank"
                class="px-4 py-2 bg-blue-500 text-white rounded text-sm no-underline hover:bg-blue-600 cursor-pointer"
              >📂 在新标签页中打开</a>
              <button
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 cursor-pointer"
                @click="retry"
              >🔄 重试</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  url: { type: String, default: '' },
  filename: { type: String, default: 'document.pdf' }
})

const emit = defineEmits(['close'])

const canvasRef = ref(null)

// 状态机
const state = ref('idle')
const errorMessage = ref('')
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.5)
const canvasWidth = ref(0)

let pdfDoc = null

/** 加载 PDF */
async function loadPdf(pdfUrl) {
  state.value = 'loading'
  errorMessage.value = ''
  pdfDoc = null
  currentPage.value = 1
  totalPages.value = 0

  try {
    const pdfjsLib = await import('pdfjs-dist')
    // 配置 worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).href
    }

    const pdf = await pdfjsLib.getDocument(pdfUrl).promise
    pdfDoc = pdf
    totalPages.value = pdf.numPages
    state.value = 'loaded'
    await nextTick()
    renderPage(1)
  } catch (e) {
    console.error('PDF 加载失败:', e)
    state.value = 'error'
    errorMessage.value = e.message || '无法加载此 PDF'
  }
}

/** 渲染指定页 */
async function renderPage(num) {
  if (!pdfDoc || !canvasRef.value) return
  try {
    const page = await pdfDoc.getPage(num)
    const viewport = page.getViewport({ scale: scale.value })
    const canvas = canvasRef.value
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvasWidth.value = Math.min(viewport.width, 750) // 限制最大显示宽度

    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
  } catch (e) {
    console.error('PDF 渲染页失败:', e)
  }
}

function goPrev() {
  if (currentPage.value > 1) {
    currentPage.value--
    renderPage(currentPage.value)
  }
}

function goNext() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    renderPage(currentPage.value)
  }
}

function goToPage(num) {
  const p = parseInt(num)
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p
    renderPage(p)
  }
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 4)
  if (pdfDoc) renderPage(currentPage.value)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.5)
  if (pdfDoc) renderPage(currentPage.value)
}

function retry() {
  if (props.url) loadPdf(props.url)
}

function close() {
  pdfDoc = null
  state.value = 'idle'
  emit('close')
}

onBeforeUnmount(() => {
  pdfDoc = null
})

// 打开时加载
watch(() => props.visible, (val) => {
  if (val && props.url) {
    currentPage.value = 1
    loadPdf(props.url)
  } else if (!val) {
    pdfDoc = null
  }
})
</script>
