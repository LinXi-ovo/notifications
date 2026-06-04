<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-4xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800 m-0">管理后台</h2>
        <button
          v-if="!showForm && !userStore.isAdmin"
          class="text-sm text-gray-500 bg-transparent border-none cursor-pointer"
          @click="router.push('/')"
        >
          ← 返回首页
        </button>
      </div>

      <!-- 非管理员提示 -->
      <div v-if="!userStore.isAdmin" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
        需要管理员权限才能管理通知。
        <router-link to="/" class="text-blue-500">返回首页</router-link>
      </div>

      <template v-if="userStore.isAdmin">
        <!-- 表单区域 -->
        <div v-if="showForm" class="mb-6">
          <NotificationForm
            :notification="editingNotification"
            @saved="handleSaved"
            @cancel="showForm = false"
          />
        </div>

        <!-- 工具栏 -->
        <div v-else class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-500 m-0">共 {{ store.total }} 条通知</p>
          <button
            class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer border-none"
            @click="openCreate"
          >
            ＋ 新建通知
          </button>
        </div>

        <!-- 通知列表 -->
        <div v-if="!showForm" class="space-y-2">
          <div
            v-for="item in store.list"
            :key="item.id"
            class="bg-white rounded-lg border p-4 flex items-start justify-between gap-4"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs px-1.5 py-0.5 rounded" :class="typeClass(item.type)">
                  {{ typeIcon(item.type) }} {{ item.type }}
                </span>
                <span v-if="item.priority > 0" class="text-xs text-yellow-600">⭐ 置顶</span>
              </div>
              <p class="text-sm font-medium text-gray-800 mt-1 truncate m-0">{{ item.title }}</p>
              <p class="text-xs text-gray-400 mt-1 m-0">{{ formatDate(item.createdAt) }}</p>
            </div>
            <div class="flex gap-1 shrink-0">
              <button
                class="px-2 py-1 text-xs text-blue-500 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border-none"
                @click="openEdit(item)"
              >
                编辑
              </button>
              <button
                class="px-2 py-1 text-xs text-red-500 bg-red-50 rounded hover:bg-red-100 cursor-pointer border-none"
                @click="handleDelete(item)"
              >
                删除
              </button>
            </div>
          </div>

          <div v-if="store.list.length === 0" class="text-center py-12 text-gray-400">
            <p>还没有通知</p>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { deleteNotification } from '@/api/notification'
import NotificationForm from '@/components/NotificationForm.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const store = useNotificationStore()

const showForm = ref(false)
const editingNotification = ref(null)

onMounted(() => {
  store.fetchList({ pageSize: 100 })
})

function openCreate() {
  editingNotification.value = null
  showForm.value = true
}

function openEdit(item) {
  editingNotification.value = item
  showForm.value = true
}

function handleSaved() {
  showForm.value = false
  store.fetchList({ pageSize: 100 })
}

function handleDelete(item) {
  if (!confirm(`确定删除「${item.title}」？`)) return
  deleteNotification(item.id).then(() => {
    store.fetchList({ pageSize: 100 })
  }).catch(e => {
    alert('删除失败: ' + (e.message || e))
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function typeIcon(type) {
  const map = { zongce: '📊', baoyan: '🎓', course: '📚', activity: '🎉', homework: '📝', other: '📌' }
  return map[type] || '📌'
}

function typeClass(type) {
  const map = { zongce: 'bg-blue-50 text-blue-600', baoyan: 'bg-purple-50 text-purple-600', course: 'bg-green-50 text-green-600', activity: 'bg-orange-50 text-orange-600', homework: 'bg-red-50 text-red-600', other: 'bg-gray-50 text-gray-600' }
  return map[type] || 'bg-gray-50 text-gray-600'
}
</script>
