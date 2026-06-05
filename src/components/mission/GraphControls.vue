<template>
  <div class="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 px-2 py-1.5">
    <button
      class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-30"
      title="缩小"
      :disabled="zoom <= 0.25"
      @click="$emit('zoomOut')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
    </button>

    <span class="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-center tabular-nums">{{ Math.round(zoom * 100) }}%</span>

    <button
      class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-30"
      title="放大"
      :disabled="zoom >= 2"
      @click="$emit('zoomIn')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
    </button>

    <div class="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />

    <button
      class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
      title="适应画布"
      @click="$emit('fitToScreen')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  zoom: { type: Number, default: 1 }
})

defineEmits(['zoomIn', 'zoomOut', 'fitToScreen'])
</script>
