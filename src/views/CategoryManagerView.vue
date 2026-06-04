<template>
  <div class="bg-gray-50 min-h-screen">
    <main class="max-w-4xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-gray-800 m-0 flex items-center gap-2">
          🏷️ 分类管理
        </h1>
        <button
          class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer border-none"
          @click="openCreate"
        >
          ＋ 新建分类
        </button>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="text-center py-12 text-gray-400">⏳ 加载中...</div>

      <!-- 空状态 -->
      <div v-else-if="categories.length === 0" class="text-center py-12 text-gray-400">
        <p>还没有分类</p>
      </div>

      <!-- 分类列表 -->
      <div v-else class="space-y-2">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="bg-white rounded-lg border px-4 py-3 flex items-center gap-3"
        >
          <span class="text-xl shrink-0">{{ cat.icon }}</span>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-800">{{ cat.name }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded" :class="colorClass(cat.color)">
                {{ cat.value }}
              </span>
            </div>
            <div class="text-xs text-gray-400 mt-0.5">
              排序: {{ cat.sortOrder }} · 颜色: {{ cat.color }}
            </div>
          </div>

          <button class="text-sm text-gray-400 hover:text-blue-500 bg-transparent border-none cursor-pointer" @click="openEdit(cat)">✏️</button>
          <button class="text-sm text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer" @click="confirmDelete(cat)">🗑️</button>
        </div>
      </div>

      <!-- 新建/编辑弹窗 -->
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="closeForm">
        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
          <h2 class="text-lg font-bold text-gray-800 mb-4 m-0">{{ editingId ? '编辑分类' : '新建分类' }}</h2>

          <form @submit.prevent="handleSave" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-600 mb-1">名称 *</label>
                <input v-model="form.name" required class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">标识符 *</label>
                <input v-model="form.value" required class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-gray-600 mb-1">图标 (Emoji)</label>
                <input v-model="form.icon" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">颜色</label>
                <select v-model="form.color" class="w-full px-3 py-2 rounded border border-gray-300 text-sm">
                  <option value="gray">灰色</option>
                  <option value="blue">蓝色</option>
                  <option value="red">红色</option>
                  <option value="green">绿色</option>
                  <option value="orange">橙色</option>
                  <option value="purple">紫色</option>
                  <option value="yellow">黄色</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">排序权重（数字越小越靠前）</label>
              <input v-model.number="form.sortOrder" type="number" class="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
            </div>

            <div v-if="formError" class="text-sm text-red-500">{{ formError }}</div>

            <div class="flex gap-2 pt-2">
              <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer border-none" :disabled="saving">
                {{ saving ? '保存中...' : '保存' }}
              </button>
              <button type="button" class="px-4 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 cursor-pointer border-none" @click="closeForm">
                取消
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- 删除确认 -->
      <ConfirmDialog
        :visible="deleteTarget !== null"
        :message="deleteTarget ? `确定删除分类「${deleteTarget.name}」吗？已有的通知不会受影响。` : ''"
        @confirm="handleDelete"
        @cancel="deleteTarget = null"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/category'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const categories = ref([])
const loading = ref(false)

const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ name: '', value: '', icon: '📌', color: 'gray', sortOrder: 99 })

const deleteTarget = ref(null)

onMounted(fetchData)

async function fetchData() {
  loading.value = true
  try {
    categories.value = await getCategories()
  } catch (e) {
    console.error('加载分类失败:', e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.value = { name: '', value: '', icon: '📌', color: 'gray', sortOrder: 99 }
  formError.value = ''
  showForm.value = true
}

function openEdit(cat) {
  editingId.value = cat.id
  form.value = { name: cat.name, value: cat.value, icon: cat.icon, color: cat.color, sortOrder: cat.sortOrder }
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
}

async function handleSave() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await updateCategory(editingId.value, form.value)
    } else {
      await createCategory(form.value)
    }
    closeForm()
    await fetchData()
  } catch (e) {
    formError.value = e.error || e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

function confirmDelete(cat) {
  deleteTarget.value = cat
}

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteCategory(deleteTarget.value.id)
    deleteTarget.value = null
    await fetchData()
  } catch (e) {
    console.error('删除失败:', e)
    deleteTarget.value = null
  }
}

function colorClass(color) {
  const map = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  }
  return map[color] || map.gray
}
</script>
