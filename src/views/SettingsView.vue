<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-3xl mx-auto px-4 py-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4 m-0">⚙️ 设置</h2>

      <div class="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <!-- 显示测试通知 -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-800 m-0">🧪 显示测试通知</p>
            <p class="text-xs text-gray-400 mt-0.5 m-0">在首页显示类型为「测试」的通知</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="showTest" class="sr-only peer" />
            <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
          </label>
        </div>

        <hr class="border-gray-200" />

        <!-- 调试模式 -->
        <div class="flex items-center justify-between" :class="{ 'opacity-50': !isAdmin }">
          <div>
            <p class="text-sm font-medium text-gray-800 m-0">🧪 调试模式</p>
            <p class="text-xs text-gray-400 mt-0.5 m-0">{{ isAdmin ? '显示 HTML 源码、Mermaid 调试预设等开发者功能' : '仅管理员可开启' }}</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="debugMode" class="sr-only peer" :disabled="!isAdmin" />
            <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 peer-disabled:opacity-40"></div>
          </label>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()
const isAdmin = computed(() => userStore.isAdmin)

const debugMode = ref(localStorage.getItem('mermaid-debug') === 'true')
watch(debugMode, (v) => {
  if (!isAdmin.value) {
    debugMode.value = false
    return
  }
  localStorage.setItem('mermaid-debug', v ? 'true' : 'false')
})

const showTest = ref(localStorage.getItem('show-test-notifications') === 'true')
watch(showTest, (v) => {
  localStorage.setItem('show-test-notifications', v ? 'true' : 'false')
})
</script>
