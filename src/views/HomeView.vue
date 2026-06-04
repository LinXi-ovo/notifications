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
          :is-fav="favorites.has(item.id)"
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
      to="/admin"
      class="fixed bottom-6 right-6 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl no-underline hover:bg-blue-600 transition-colors"
    >
      ＋
    </router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useUserStore } from '@/stores/user'
import { getCategories } from '@/api/category'
import CategoryNav from '@/components/CategoryNav.vue'
import SearchBar from '@/components/SearchBar.vue'
import NotificationCard from '@/components/NotificationCard.vue'

const store = useNotificationStore()
const userStore = useUserStore()

const categories = ref([])
const currentType = ref(null)
const searchQuery = ref('')
const favorites = ref(new Set())

const totalPages = computed(() => Math.ceil(store.total / store.pageSize) || 1)

onMounted(async () => {
  try {
    categories.value = await getCategories()
  } catch (e) {
    console.error('加载分类失败:', e)
  }
  store.fetchList()
})

function handleTypeChange(type) {
  currentType.value = type
  store.setType(type)
}

function handleSearch(query) {
  searchQuery.value = query
  store.setSearch(query)
}
</script>
