<template>
  <div
    v-if="store.currentItem"
    class="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden"
    :class="{ 'border-yellow-200': isPriority2 }"
  >
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 pt-3 pb-1">
      <div class="flex items-center gap-1.5">
        <span class="text-sm">📚</span>
        <span class="text-xs font-semibold text-gray-700">每日资讯</span>
      </div>
      <button
        class="text-gray-300 hover:text-gray-500 bg-transparent border-none cursor-pointer text-sm leading-none p-0.5 transition-colors"
        title="关闭"
        @click="handleDismiss"
      >✕</button>
    </div>

    <!-- 内容 -->
    <div class="px-4 py-2 text-sm text-gray-700 leading-relaxed line-clamp-3 [&_a]:text-blue-500 [&_a]:underline" v-html="store.currentItem.content">
    </div>

    <!-- 底部 -->
    <div class="flex items-center justify-between px-4 py-2 border-t border-gray-50">
      <span class="text-[10px] text-gray-400">📎 {{ store.currentItem.source || '精选' }}</span>
      <div class="flex gap-1">
        <button
          class="text-xs px-2 py-1 rounded transition-colors cursor-pointer border-none"
          :class="isFav ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'"
          @click="handleToggleFav"
        >
          {{ isFav ? '❤️' : '🤍' }}
        </button>
        <button
          class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 cursor-pointer border-none"
          @click="handleDismiss"
        >
          查看详情 →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'

const store = useKnowledgeStore()

const isPriority2 = computed(() => store.currentItem?.priority === 2)

const isFav = computed(() => {
  const id = store.currentItem?.objectId || store.currentItem?.id
  return id ? store.userState.favoriteIds.includes(id) : false
})

function handleDismiss() {
  store.dismissToday()
}

function handleToggleFav() {
  const id = store.currentItem?.objectId || store.currentItem?.id
  if (id) store.toggleFavorite(id)
}
</script>
