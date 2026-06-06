<template>
  <div
    class="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
    :class="priorityBorderClass"
    @click="goDetail"
  >
    <div class="p-4">
      <!-- 优先级标记 -->
      <div v-if="priority > 0" class="flex items-center gap-1 mb-2">
        <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="priorityBadgeClass">
          {{ priorityLabel }}
        </span>
      </div>

      <!-- 标题行 -->
      <div class="flex items-start gap-2">
        <span class="text-lg shrink-0">{{ typeIcon }}</span>
        <h3 class="text-base font-medium text-gray-900 m-0 flex-1 leading-snug">
          {{ notification.title }}
        </h3>
        <button
          v-if="userStore.isLoggedIn"
          class="shrink-0 text-lg bg-transparent border-none cursor-pointer p-0 hover:scale-110 transition-transform"
          @click.stop="toggleFavorite"
        >
          {{ isFav ? '⭐' : '☆' }}
        </button>
      </div>

      <!-- 元信息 -->
      <div class="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
        <span v-if="notification.sourcePerson">{{ notification.sourcePerson }}</span>
        <span v-if="notification.sourcePerson && notification.sourceGroup">·</span>
        <span v-if="notification.sourceGroup">{{ notification.sourceGroup }}</span>
        <span v-if="notification.sourcePerson || notification.sourceGroup">·</span>
        <span>{{ formatDate(notification.createdAt) }}</span>
      </div>

      <!-- 标签 -->
      <div v-if="notification.tags && notification.tags.length" class="flex gap-1 mt-2 flex-wrap">
        <span
          v-for="tag in notification.tags"
          :key="tag"
          class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded"
        >
          #{{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { PRIORITY_LABEL } from '@/utils/constants'

const props = defineProps({
  notification: { type: Object, required: true },
  isFav: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-favorite'])
const router = useRouter()
const userStore = useUserStore()

const priority = computed(() => props.notification.priority ?? 0)
const priorityLabel = computed(() => PRIORITY_LABEL[priority.value]?.label || '')
const priorityBadgeClass = computed(() => {
  const map = {
    1: 'bg-yellow-100 text-yellow-700',
    2: 'bg-red-100 text-red-700',
    3: 'bg-orange-100 text-orange-700'
  }
  return map[priority.value] || ''
})
const priorityBorderClass = computed(() => {
  const map = {
    1: 'border-l-yellow-400 border-l-4',
    2: 'border-l-red-500 border-l-4',
    3: 'border-l-orange-500 border-l-4'
  }
  return map[priority.value] || ''
})

const typeIcon = computed(() => {
  const map = {
    zongce: '📊', baoyan: '🎓', course: '📚', activity: '🎉',
    homework: '📝', party: '🚩', consult: '💬', other: '📌'
  }
  return map[props.notification.type] || '📌'
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function goDetail() {
  router.push(`/detail/${props.notification.id}`)
}

function toggleFavorite() {
  emit('toggle-favorite', props.notification.id)
}
</script>
