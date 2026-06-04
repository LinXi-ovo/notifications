<template>
  <div class="bg-gray-50 min-h-screen">
    <main class="max-w-4xl mx-auto px-4 py-6">
      <h1 class="text-xl font-bold text-gray-800 mb-4 m-0 flex items-center gap-2">
        ⭐ 我收藏的通知
      </h1>

      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-12 text-gray-400">
        <div class="text-3xl mb-2">⏳</div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="store.list.length === 0" class="text-center py-12 text-gray-400">
        <div class="text-4xl mb-3">📭</div>
        <p>还没有收藏任何通知</p>
        <router-link to="/" class="text-sm text-blue-500 hover:underline mt-2 inline-block">
          去首页看看
        </router-link>
      </div>

      <!-- 收藏列表 -->
      <div v-else class="space-y-3">
        <NotificationCard
          v-for="item in store.list"
          :key="item.id"
          :notification="item"
          :is-fav="true"
          @toggle-favorite="handleToggle"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useFavoriteStore } from '@/stores/favorite'
import { getNotification } from '@/api/notification'
import NotificationCard from '@/components/NotificationCard.vue'

const store = useFavoriteStore()
const loading = computed(() => store.loading)

onMounted(() => {
  store.fetchFavorites({ getNotification })
})

function handleToggle(id) {
  store.toggle(id)
}
</script>
