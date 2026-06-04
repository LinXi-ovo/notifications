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
        <canvas v-for="n in renderPages" :key="n" :ref="el => setCanvasRef(el, n)" class="shadow-lg mb-4"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import * as pdfjs from 'pdfjs-dist'

// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const props = defineProps({
  visible: { type: Boolean, default: false },
  url: { type: String, default: '' },
  filename: { type: String, default: 'document.pdf' }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const pageNum = ref(1)
const totalPages = ref(0)
const renderPages = ref(1)
const canvasRefs = {}
let pdfDoc = null

function setCanvasRef(el, n) {
  canvasRefs[n] = el
}

function close() {
  emit('close')
}

function prevPage() {
  if (pageNum.value > 1) {
    pageNum.value--
    renderPages.value = pageNum.value
    nextTick(() => renderPage(pageNum.value))
  }
}

function nextPage() {
  if (pageNum.value < totalPages.value) {
    pageNum.value++
    renderPages.value = pageNum.value
    nextTick(() => renderPage(pageNum.value))
  }
}

async function renderPage(num) {
  if (!pdfDoc || !canvasRefs[num]) return
  const page = await pdfDoc.getPage(num)
  const viewport = page.getViewport({ scale: 1.5 })
  const canvas = canvasRefs[num]
  canvas.height = viewport.height
  canvas.width = viewport.width
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
}

async function loadPdf() {
  if (!props.url) return
  loading.value = true
  pageNum.value = 1
  pdfDoc = null
  try {
    pdfDoc = await pdfjs.getDocument(props.url).promise
    totalPages.value = pdfDoc.numPages
    renderPages.value = 1
    await nextTick()
    await renderPage(1)
  } catch (e) {
    console.error('PDF 加载失败:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (v) => {
  if (v) loadPdf()
})
</script>
