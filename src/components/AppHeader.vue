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
          <router-link to="/" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            📚 资讯
          </router-link>
          <router-link to="/missions" class="text-sm text-gray-500 hover:text-gray-700 no-underline">
            📋 任务
          </router-link>
          <!-- 快捷链接下拉 -->
          <div class="relative" @mouseenter="showLinks = true" @mouseleave="showLinks = false">
            <button class="text-sm text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer flex items-center gap-0.5">
              🔗 链接
              <svg class="w-3 h-3 mt-0.5 transition-transform" :class="showLinks ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div
              v-if="showLinks && links.length"
              class="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[180px] z-50"
            >
              <a
                v-for="link in links"
                :key="link.id"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline transition-colors"
              >
                <span>{{ link.icon || '🔗' }}</span>
                <span>{{ link.title }}</span>
              </a>
            </div>
          </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

/** 快捷链接 */
const QUICK_LINKS_KEY = 'quick-links'
const DEFAULT_LINKS = [
  { id: 'ql_teachermate', title: '微助教', icon: '📝', url: 'https://v18.teachermate.cn/wechat-pro-ssr/?openid=8ec1fe760da7be8a11276e53837b7206&from=wzj' },
]
const showLinks = ref(false)
const links = ref(loadLinks())

function loadLinks() {
  try {
    const raw = localStorage.getItem(QUICK_LINKS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_LINKS
  } catch { return [...DEFAULT_LINKS] }
}

/** 监听其他标签页对 localStorage 的修改 */
function onStorage(e) {
  if (e.key === QUICK_LINKS_KEY) links.value = loadLinks()
}

onMounted(() => window.addEventListener('storage', onStorage))
onUnmounted(() => window.removeEventListener('storage', onStorage))

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>
