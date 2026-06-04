<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    @click.self="close"
  >
    <button
      class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white text-xl bg-black/40 rounded-full hover:bg-black/60 cursor-pointer border-none z-10"
      @click="close"
    >
      ✕
    </button>
    <img
      :src="src"
      :alt="alt"
      class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
      @click.stop
    />
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  src: { type: String, default: '' },
  alt: { type: String, default: '' }
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}
</script>
