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

      <!-- PDF 预览区域 -->
      <div class="flex-1 bg-gray-100 relative min-h-[300px] flex items-stretch">
        <!-- 加载中 -->
        <div
          v-if="state === 'loading'"
          class="absolute inset-0 flex items-center justify-center"
        >
          <div class="text-center">
            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p class="text-sm text-gray-400">正在加载 PDF...</p>
          </div>
        </div>

        <!-- iframe PDF 预览（仅 loaded 状态显示） -->
        <iframe
          v-show="state === 'loaded'"
          :key="reloadKey"
          :src="url"
          class="w-full h-full border-none"
          @load="onLoad"
        ></iframe>

        <!-- 加载失败 / 不支持 -->
        <div
          v-if="state === 'error'"
          class="absolute inset-0 flex items-center justify-center bg-gray-100/90"
        >
          <div class="text-center p-8 max-w-sm">
            <p class="text-4xl mb-2">{{ isIOS ? '📱' : '❌' }}</p>
            <p class="text-lg text-red-500 mb-2">{{ isIOS ? 'iOS Safari 不支持内嵌 PDF 预览' : 'PDF 预览不可用' }}</p>
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
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  url: { type: String, default: '' },
  filename: { type: String, default: 'document.pdf' }
})

const emit = defineEmits(['close'])

// 状态机: 'loading' → 'loaded' | 'error'
const state = ref('loading')
const errorMessage = ref('')
const reloadKey = ref(0)

let loadTimer = null

/** 是否 iOS Safari（完全不支持 iframe 内嵌 PDF） */
const isIOS = /iP(ad|hone|od).+Safari/.test(navigator.userAgent)

/** 开始加载 PDF */
function startLoad() {
  clearTimer()
  state.value = 'loading'
  errorMessage.value = ''

  // iOS Safari 不支持 iframe 内嵌 PDF，直接降级
  if (isIOS) {
    state.value = 'error'
    errorMessage.value = '请点击下方按钮在新标签页中查看'
    return
  }

  // 10 秒超时降级
  loadTimer = setTimeout(() => {
    if (state.value === 'loading') {
      state.value = 'error'
      errorMessage.value = 'PDF 加载超时，请尝试在新标签页中打开'
    }
  }, 10000)
}

/** 清除计时器 */
function clearTimer() {
  if (loadTimer !== null) {
    clearTimeout(loadTimer)
    loadTimer = null
  }
}

/** iframe 内容加载完成 */
function onLoad() {
  if (state.value === 'loading') {
    clearTimer()
    state.value = 'loaded'
  }
}

/** 重试 */
function retry() {
  reloadKey.value++
  startLoad()
}

/** 关闭 */
function close() {
  clearTimer()
  state.value = 'loading'
  errorMessage.value = ''
  emit('close')
}

// 每次打开时启动加载流程
watch(() => props.visible, (val) => {
  if (val && props.url) {
    startLoad()
  }
}, { immediate: false })
</script>
