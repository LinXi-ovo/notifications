<template>
  <svg
    class="absolute top-0 left-0 pointer-events-none"
    :width="svgWidth"
    :height="svgHeight"
  >
    <!-- 箭头标记 -->
    <defs>
      <marker
        id="arrowhead"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" :fill="arrowColor" />
      </marker>
    </defs>

    <line
      v-for="edge in edges"
      :key="edge.id"
      :x1="edge._x1"
      :y1="edge._y1"
      :x2="edge._x2"
      :y2="edge._y2"
      :class="edge._selected ? 'stroke-blue-500' : 'stroke-gray-300 dark:stroke-gray-500'"
      stroke-width="2"
      marker-end="url(#arrowhead)"
      class="pointer-events-auto cursor-pointer transition-colors hover:stroke-blue-400"
      @click.stop="$emit('selectEdge', edge.id)"
    />

    <!-- 边标签 -->
    <text
      v-for="edge in edges"
      :key="'label-' + edge.id"
      :x="(edge._x1 + edge._x2) / 2"
      :y="(edge._y1 + edge._y2) / 2 - 6"
      text-anchor="middle"
      class="text-xs fill-gray-500 dark:fill-gray-400 pointer-events-none"
      font-size="11"
    >
      {{ edge.label || '' }}
    </text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  edges: { type: Array, default: () => [] },
  svgWidth: { type: Number, default: 2000 },
  svgHeight: { type: Number, default: 2000 },
  selectedEdgeId: { type: String, default: null }
})

defineEmits(['selectEdge'])

const arrowColor = computed(() => {
  return props.selectedEdgeId ? '#3B82F6' : '#9CA3AF'
})
</script>
