<template>
  <span
    class="inline-flex items-center gap-0.5 rounded font-medium"
    :class="[sizeClass, colorClass]"
  >
    {{ icon }} {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'todo' },
  size: { type: String, default: 'md' } // sm | md
})

const STATUS_MAP = {
  'todo': { label: '未开始', icon: '⬜', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  'in-progress': { label: '进行中', icon: '🔄', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  'completed': { label: '已完成', icon: '✅', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  'blocked': { label: '阻塞', icon: '⛔', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  'cancelled': { label: '已取消', icon: '🗑️', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' }
}

const info = computed(() => STATUS_MAP[props.status] || STATUS_MAP['todo'])

const label = computed(() => info.value.label)
const icon = computed(() => info.value.icon)
const colorClass = computed(() => info.value.color)

const sizeClass = computed(() => props.size === 'sm' ? 'text-xs px-1 py-0.5' : 'text-sm px-2 py-0.5')
</script>
