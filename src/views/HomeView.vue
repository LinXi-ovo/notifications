<template>
  <div class="bg-gray-50 min-h-screen">
    <!-- 分类导航 -->
    <CategoryNav
      :categories="categories"
      :current="currentType"
      :total="store.total"
      @change="handleTypeChange"
    />

    <main class="max-w-4xl mx-auto px-4 py-4">
      <!-- 每日资讯（移动端） -->
      <KnowledgeInline v-if="showKnowledgeMobile" />

      <!-- 我的任务概览 -->
      <div v-if="userStore.isLoggedIn && userTasks.length" class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-600 dark:text-gray-300">
            📋 我的任务
            <span class="text-xs font-normal text-gray-400 ml-1">({{ userTasks.length }})</span>
          </h2>
          <router-link to="/missions" class="text-xs text-blue-500 hover:text-blue-700 no-underline">
            查看全部 →
          </router-link>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <router-link
            v-for="item in userTasks"
            :key="item.id"
            :to="'/mission/' + item.id"
            class="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow no-underline"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ item.title }}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                {{ item.status === 'active' ? '进行中' : '已归档' }}
              </span>
            </div>
            <!-- 进度 -->
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div class="bg-blue-500 rounded-full h-full transition-all" :style="{ width: (item._progress || 0) + '%' }"></div>
              </div>
              <span class="tabular-nums">{{ item._progress || 0 }}%</span>
            </div>
            <!-- 下一个待操作节点 -->
            <div v-if="item._nextActionableNode" class="mt-2 text-xs text-gray-400 dark:text-gray-500">
              待操作: <span class="font-medium text-blue-500">{{ item._nextActionableNode }}</span>
            </div>
          </router-link>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="mb-4">
        <SearchBar v-model="searchQuery" @update:model-value="handleSearch" />
      </div>

      <!-- 加载状态 -->
      <div v-if="store.loading" class="text-center py-12 text-gray-400">
        <div class="text-3xl mb-2">⏳</div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="store.list.length === 0" class="text-center py-12 text-gray-400">
        <div class="text-4xl mb-3">📭</div>
        <p v-if="searchQuery">没有找到包含"{{ searchQuery }}"的通知</p>
        <p v-else-if="currentType">这个分类还没有通知</p>
        <p v-else>还没有通知，等管理员发布吧</p>
      </div>

      <!-- 通知列表 -->
      <div v-else class="space-y-3">
        <NotificationCard
          v-for="item in store.list"
          :key="item.id"
          :notification="item"
          :is-fav="favStore.ids.has(item.id)"
          @toggle-favorite="handleToggleFavorite"
        />
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-6">
        <button
          :disabled="store.currentPage <= 1"
          class="px-3 py-1 rounded text-sm bg-white border disabled:opacity-30 cursor-pointer disabled:cursor-default"
          @click="store.setPage(store.currentPage - 1)"
        >
          上一页
        </button>
        <span class="text-sm text-gray-500">{{ store.currentPage }} / {{ totalPages }}</span>
        <button
          :disabled="store.currentPage >= totalPages"
          class="px-3 py-1 rounded text-sm bg-white border disabled:opacity-30 cursor-pointer disabled:cursor-default"
          @click="store.setPage(store.currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </main>

    <!-- 管理入口 FAB -->
    <router-link
      v-if="userStore.isAdmin"
      to="/admin?create=true"
      class="fixed bottom-6 right-6 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl no-underline hover:bg-blue-600 transition-colors"
    >
      ＋
    </router-link>

    <!-- 每日资讯（桌面端浮动卡片） -->
    <KnowledgeCard ref="knowledgeCardRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useUserStore } from '@/stores/user'
import { useFavoriteStore } from '@/stores/favorite'
import { useKnowledgeStore } from '@/stores/knowledge'
import { getCategories } from '@/api/category'
import { getUserMissions } from '@/api/mission'
import { DEFAULT_CATEGORIES } from '@/utils/constants'
import CategoryNav from '@/components/CategoryNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import NotificationCard from '@/components/NotificationCard.vue'
import KnowledgeCard from '@/components/KnowledgeCard.vue'
import KnowledgeInline from '@/components/KnowledgeInline.vue'

const store = useNotificationStore()
const userStore = useUserStore()
const favStore = useFavoriteStore()
const knowledgeStore = useKnowledgeStore()

const categories = ref([])
const currentType = ref(null)
const searchQuery = ref('')
const searchTimeout = ref(null)
const userTasks = ref([])
const showKnowledgeMobile = ref(false)
const knowledgeCardRef = ref(null)

const totalPages = computed(() => Math.ceil(store.total / store.pageSize) || 1)

onMounted(async () => {
  showKnowledgeMobile.value = localStorage.getItem('knowledge:showOnMobile') === 'true'

  try {
    categories.value = await getCategories()
    // 开启显示测试通知时，补入 test 分类（可能不在 Bmob 表中）
    if (localStorage.getItem('show-test-notifications') === 'true') {
      const testCat = DEFAULT_CATEGORIES.find(c => c.value === 'test')
      if (testCat && !categories.value.some(c => c.value === 'test')) {
        categories.value.push({ ...testCat })
      }
    }
  } catch (e) {
    console.error('加载分类失败:', e)
  }
  store.fetchList()
  if (userStore.isLoggedIn) {
    favStore.refresh()
    loadUserTasks()
  }

  // 每日资讯推送检测
  if (localStorage.getItem('knowledge:enabled') !== 'false') {
    await knowledgeStore.checkAndPush()
    if (knowledgeStore.currentItem) {
      // 延迟展开卡片（等待页面渲染完成）
      setTimeout(() => {
        if (knowledgeCardRef.value) {
          knowledgeCardRef.value.expand?.()
        }
      }, 500)
    }
  }
})

function handleTypeChange(type) {
  currentType.value = type
  store.setType(type)
}

function handleSearch(query) {
  searchQuery.value = query
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    store.setSearch(query)
  }, 300)
}

function handleToggleFavorite(id) {
  favStore.toggle(id)
}

/** 加载用户参与的任务 */
async function loadUserTasks() {
  if (!userStore.username) return
  try {
    const missions = await getUserMissions(userStore.username)
    if (!missions || !missions.length) return
    userTasks.value = missions.map(m => {
      // 计算进度
      const total = m.nodes?.length || 0
      const done = m.nodes?.filter(n => n.status === 'completed').length || 0
      const pct = total ? Math.round((done / total) * 100) : 0

      // 找下一个待操作节点
      let nextNode = null
      if (m.nodes && userStore.username) {
        // 找第一个非完成的节点，按 position 排序
        const nodes = [...m.nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
        nextNode = nodes.find(n => n.status !== 'completed' && n.status !== 'cancelled')
      }

      return {
        id: m.id,
        title: m.title,
        status: m.status,
        _progress: pct,
        _nextActionableNode: nextNode?.title || null
      }
    })
  } catch (e) {
    console.warn('加载用户任务失败:', e.message)
  }
}
</script>
