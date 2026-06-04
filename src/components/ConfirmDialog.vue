<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="cancel">
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
      <p class="text-sm text-gray-800 m-0 mb-4">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button
          class="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer border-none"
          @click="cancel"
        >
          取消
        </button>
        <button
          class="px-3 py-1.5 text-sm text-white bg-red-500 rounded hover:bg-red-600 cursor-pointer border-none"
          @click="confirm"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  message: { type: String, default: '确定执行此操作吗？' }
})

const emit = defineEmits(['confirm', 'cancel'])

function confirm() { emit('confirm') }
function cancel() { emit('cancel') }
</script>
