<template>
  <div class="bg-white rounded-lg shadow-sm border p-6 w-full max-w-sm">
    <h2 class="text-xl font-bold text-gray-800 text-center mb-6 m-0">
      {{ isRegister ? '注册' : '登录' }}
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm text-gray-600 mb-1">用户名</label>
        <input
          v-model="form.username"
          type="text"
          class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>

      <div v-if="isRegister">
        <label class="block text-sm text-gray-600 mb-1">邮箱</label>
        <input
          v-model="form.email"
          type="email"
          class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-600 mb-1">密码</label>
        <input
          v-model="form.password"
          type="password"
          class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>

      <p v-if="error" class="text-sm text-red-500 m-0">{{ error }}</p>

      <button
        type="submit"
        class="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors cursor-pointer border-none"
        :disabled="loading"
      >
        {{ loading ? '处理中...' : (isRegister ? '注册' : '登录') }}
      </button>
    </form>

    <p class="text-sm text-gray-500 text-center mt-4 m-0">
      {{ isRegister ? '已有账号？' : '没有账号？' }}
      <button
        type="button"
        class="text-blue-500 bg-transparent border-none cursor-pointer hover:underline"
        @click="isRegister = !isRegister"
      >
        {{ isRegister ? '去登录' : '去注册' }}
      </button>
    </p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const isRegister = ref(false)
const loading = ref(false)
const error = ref('')

const form = reactive({
  username: '',
  email: '',
  password: ''
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (isRegister.value) {
      await userStore.register({
        username: form.username,
        password: form.password,
        email: form.email || undefined
      })
    } else {
      await userStore.login(form.username, form.password)
    }
    router.push('/')
  } catch (e) {
    error.value = e.error || e.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>
