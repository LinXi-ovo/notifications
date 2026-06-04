<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
      <!-- 顶部 -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span class="text-sm text-gray-600 truncate">📄 {{ filename }}</span>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-400">{{ pageNum }} / {{ totalPages }}</span>
          <button class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer border-none disabled:opacity-30" :disabled="pageNum <= 1" @click="prevPage">◀</button>
          <button class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer border-none disabled:opacity-30" :disabled="pageNum >= totalPages" @click="nextPage">▶</button>
          <a :href="url" download class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 no-underline cursor-pointer">⬇ 下载</a>
          <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg" @click="close">✕</button>
        </div>
      </div>
      <!-- PDF 渲染区 -->
      <div class="flex-1 overflow-auto bg-gray-100 p-4 flex flex-col items-center">
        <div v-if="loading" class="py-12 text-gray-400">⏳ 加载中...</div>
        <div v-else-if="loadError" class="py-12 text-red-500 text-center">
          <p class="text-lg mb-2">❌ PDF 加载失败</p>
          <p class="text-sm text-gray-500">{{ loadError }}</p>
          <a :href="url" target="_blank" class="text-sm text-blue-500 hover:underline mt-2 inline-block">直接下载查看</a>
        </div>
        <canvas v-show="!loading && !loadError" ref="canvasRef" class="shadow-lg"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const props = defineProps({
  visible: { type: Boolean, default: false },
  url: { type: String, default: '' },
  filename: { type: String, default: 'document.pdf' }
})

const emit = defineEmits(['close'])

const canvasRef = ref(null)
const loading = ref(false)
const loadError = ref('')
const pageNum = ref(1)
const totalPages = ref(0)
let pdfDoc = null

function close() {
  emit('close')
}

async function renderPage(num) {
  if (!pdfDoc || !canvasRef.value) return
  const page = await pdfDoc.getPage(num)
  // 根据容器宽度自适应缩放
  const container = canvasRef.value.parentElement
  const maxWidth = Math.min(container?.clientWidth || 800, 900) - 32
  const viewport = page.getViewport({ scale: 1 })
  const scale = maxWidth / viewport.width
  const scaled = page.getViewport({ scale })
  const canvas = canvasRef.value
  canvas.height = scaled.height
  canvas.width = scaled.width
  canvas.style.width = `${scaled.width}px`
  canvas.style.height = `${scaled.height}px`
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise
}

function prevPage() {
  if (pageNum.value > 1) {
    pageNum.value--
    nextTick(() => renderPage(pageNum.value))
  }
}

function nextPage() {
  if (pageNum.value < totalPages.value) {
    pageNum.value++
    nextTick(() => renderPage(pageNum.value))
  }
}

async function loadPdf() {
  if (!props.url) return
  loading.value = true
  loadError.value = ''
  pageNum.value = 1
  pdfDoc = null
  try {
    pdfDoc = await pdfjs.getDocument({
      url: props.url,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/cmaps/',
      cMapPacked: true
    }).promise
    totalPages.value = pdfDoc.numPages
    await nextTick()
    await renderPage(1)
  } catch (e) {
    console.error('PDF 加载失败:', e)
    loadError.value = e.message || '未知错误'
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) loadPdf()
})
</script>
