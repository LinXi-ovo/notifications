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
          <a :href="url" target="_blank" class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 no-underline cursor-pointer">⬇ 下载</a>
          <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg" @click="close">✕</button>
        </div>
      </div>

      <!-- viewer iframe 加载 PDF.js 渲染 -->
      <div class="flex-1 bg-gray-100 relative min-h-[300px]">
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p class="text-sm text-gray-400">正在加载 PDF...</p>
          </div>
        </div>
        <iframe
          v-show="!loading"
          :key="iframeKey"
          :src="viewerUrl"
          class="w-full h-full border-none"
          @load="onIframeLoad"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  url: { type: String, default: '' },
  filename: { type: String, default: 'document.pdf' }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const iframeKey = ref(0)

/** viewer URL：用 ?file= 传递 PDF 地址 */
const viewerUrl = computed(() => {
  if (!props.url) return ''
  const encoded = encodeURIComponent(props.url)
  const base = import.meta.env.BASE_URL || '/'
  return `${base}lab/pdf-viewer.html?file=${encoded}`
})

function onIframeLoad() {
  loading.value = false
}

function close() {
  loading.value = false
  emit('close')
}

watch(() => props.visible, (val) => {
  if (val && props.url) {
    loading.value = true
    iframeKey.value++
  }
})
</script>
