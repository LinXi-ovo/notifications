<template>
  <div
    class="node-card relative rounded-lg border-2 p-3 cursor-pointer shadow-sm hover:shadow-md transition-shadow select-none min-w-[160px] max-w-[200px]"
    :class="[
      borderColor,
      bgColor,
      isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:border-blue-400',
      isSelected ? 'ring-2 ring-blue-400' : ''
    ]"
    @click.stop="$emit('select')"
    @dblclick.stop="$emit('dblclick')"
  >
    <!-- 顶部: 状态 + 权限指示 -->
    <div class="flex items-center justify-between mb-1.5">
      <StatusBadge :status="node.status" :size="'sm'" />
      <span v-if="isLocked" class="text-xs" title="不可操作">🔒</span>
      <span v-else class="text-xs" title="可操作">🟢</span>
    </div>

    <!-- 标题 -->
    <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight mb-1 line-clamp-2" :title="node.title">
      {{ node.title }}
    </h4>

    <!-- 角色标签 -->
    <span
      class="inline-block text-xs px-1.5 py-0.5 rounded font-medium mb-1.5"
      :class="roleBadgeClass"
    >
      {{ roleEmoji }} {{ roleName || node.assignedRole }}
    </span>

    <!-- 进度条（count/all 模式） -->
    <div v-if="node.completionRule !== 'single'" class="mt-1">
      <ProgressBar :pct="completionPct" :show-label="true" :color="completionPct >= 100 ? 'green' : 'blue'" />
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
        {{ node.completions.length }}/{{ completionTarget }}
      </p>
    </div>

    <!-- 子图标记 -->
    <div v-if="node.subMissionId" class="absolute -bottom-1.5 -right-1.5 text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow" title="包含子任务">
      🔽
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import ProgressBar from './ProgressBar.vue'

const props = defineProps({
  node: { type: Object, required: true },
  roleName: { type: String, default: '' },
  roleEmoji: { type: String, default: '👤' },
  roleColor: { type: String, default: '#6B7280' },
  isLocked: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false }
})

defineEmits(['select', 'dblclick'])

const borderColor = computed(() => {
  if (props.node.status === 'completed') return 'border-green-300'
  if (props.node.status === 'in-progress') return 'border-blue-300'
  if (props.node.status === 'blocked') return 'border-red-300'
  if (props.node.status === 'cancelled') return 'border-gray-300'
  return 'border-gray-200'
})

const bgColor = computed(() => {
  if (props.node.status === 'completed') return 'bg-green-50 dark:bg-green-900/20'
  if (props.node.status === 'blocked') return 'bg-red-50 dark:bg-red-900/20'
  return 'bg-white dark:bg-gray-800'
})

const roleBadgeClass = computed(() => {
  // light bg based on roleColor
  return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
})

const completionPct = computed(() => {
  if (!props.node.completionTarget) return 0
  return Math.round((props.node.completions.length / props.node.completionTarget) * 100)
})

const completionTarget = computed(() => {
  if (props.node.completionRule === 'count') return props.node.completionTarget
  return '∞'
})
</script>
