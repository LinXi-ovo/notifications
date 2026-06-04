<template>
  <div class="bg-white border-b">
    <div class="max-w-4xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto">
      <button
        :class="btnClass(null)"
        @click="$emit('change', null)"
      >
        全部
        <span class="text-xs ml-1 opacity-60">({{ total }})</span>
      </button>
      <button
        v-for="cat in categories"
        :key="cat.value"
        :class="btnClass(cat.value)"
        @click="$emit('change', cat.value)"
      >
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  categories: { type: Array, default: () => [] },
  current: { type: [String, null], default: null },
  total: { type: Number, default: 0 }
})

defineEmits(['change'])

function btnClass(value) {
  const isActive = props.current === value
  const base = 'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer border-none'
  return isActive
    ? `${base} bg-blue-500 text-white font-medium`
    : `${base} bg-gray-100 text-gray-600 hover:bg-gray-200`
}
</script>
