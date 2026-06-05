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
          <a :href="url" target="_blank" class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 no-underline cursor-pointer">⬇ 下载</a>
          <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg" @click="close">✕</button>
        </div>
      </div>
      <!-- 浏览器原生 PDF 预览 -->
      <div class="flex-1 bg-gray-100">
        <iframe
          :src="url"
          class="w-full h-full border-none"
          @error="onError"
        ></iframe>
      </div>
      <!-- 加载失败回退 -->
      <div v-if="loadError" class="absolute inset-0 flex items-center justify-center bg-gray-100/90">
        <div class="text-center p-8">
          <p class="text-lg text-red-500 mb-2">❌ PDF 加载失败</p>
          <p class="text-sm text-gray-500 mb-4">{{ loadError }}</p>
          <a :href="url" target="_blank" class="px-4 py-2 bg-blue-500 text-white rounded text-sm no-underline hover:bg-blue-600">直接打开查看</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  url: { type: String, default: '' },
  filename: { type: String, default: 'document.pdf' }
})

const emit = defineEmits(['close'])
const loadError = ref('')

function onError() {
  loadError.value = '浏览器无法直接预览此 PDF'
}

function close() {
  loadError.value = ''
  emit('close')
}
</script>
