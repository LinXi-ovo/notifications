<template>
  <header class="bg-white shadow-sm sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-2 no-underline">
        <span class="text-2xl">📢</span>
        <h1 class="text-lg font-bold text-gray-800 m-0">通知聚合</h1>
      </router-link>
      <div class="flex items-center gap-3">
        <template v-if="userStore.isLoggedIn">
          <router-link to="/favorites" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            ⭐ 收藏
          </router-link>
          <router-link to="/missions" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            📋 任务
          </router-link>
          <router-link v-if="userStore.isAdmin" to="/admin" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            ✏️ 管理
          </router-link>
          <a v-if="userStore.isAdmin" href="/lab/pdf-preview.html" target="_blank" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            🔬 实验室
          </a>
          <router-link to="/settings" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            ⚙️ 设置
          </router-link>
          <router-link to="/about" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            ℹ️ 关于
          </router-link>
          <span class="text-sm text-gray-400">|</span>
          <span class="text-sm text-gray-600">{{ userStore.username }}</span>
          <button @click="handleLogout" class="text-sm text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer">退出</button>
        </template>
        <template v-else>
          <router-link to="/login" class="text-sm text-blue-500 hover:text-blue-700 no-underline">登录</router-link>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>
