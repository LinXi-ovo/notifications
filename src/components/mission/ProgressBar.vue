<template>
  <div class="flex items-center gap-2">
    <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="barColor"
        :style="{ width: Math.min(pct, 100) + '%' }"
      />
    </div>
    <span v-if="showLabel" class="text-xs font-medium text-gray-600 dark:text-gray-300 min-w-[3rem] text-right tabular-nums">
      {{ Math.min(pct, 100) }}%
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pct: { type: Number, default: 0 },
  showLabel: { type: Boolean, default: true },
  color: { type: String, default: null } // blue | green | orange | red
})

const barColor = computed(() => {
  if (props.color) return `bg-${props.color}-500`
  if (props.pct >= 100) return 'bg-green-500'
  if (props.pct >= 60) return 'bg-blue-500'
  if (props.pct >= 30) return 'bg-orange-500'
  return 'bg-gray-400'
})
</script>
