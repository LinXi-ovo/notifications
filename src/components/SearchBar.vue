<template>
  <div class="relative">
    <input
      type="text"
      :value="modelValue"
      placeholder="搜索通知..."
      class="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
      @input="onInput"
    />
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

let timer = null

function onInput(e) {
  const val = e.target.value
  clearTimeout(timer)
  timer = setTimeout(() => {
    emit('update:modelValue', val)
  }, 300)
}
</script>
