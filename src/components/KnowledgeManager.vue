<template>
  <div>
    <!-- 编辑表单 -->
    <div v-if="showForm" class="mb-6">
      <KnowledgeEditor
        :item="editingItem"
        @saved="handleSaved"
        @cancel="showForm = false"
      />
    </div>

    <template v-else>
      <!-- 工具栏 -->
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500 m-0">共 {{ items.length }} 条资讯</p>
        <button
          class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer border-none transition-colors"
          @click="openCreate"
        >
          ＋ 新增资讯
        </button>
      </div>

      <!-- 列表 -->
      <div class="space-y-2">
        <div
          v-for="item in items"
          :key="item.objectId"
          class="bg-white rounded-lg border p-4 flex items-start justify-between gap-4"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span
                class="text-xs px-1.5 py-0.5 rounded"
                :class="categoryColor(item.category)"
              >
                {{ categoryLabel(item.category) }}
              </span>
              <span v-if="item.priority === 2" class="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded">必读</span>
              <span v-else-if="item.priority === 1" class="text-[10px] px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded">置顶</span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded"
                :class="item.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
              >
                {{ item.isActive ? '启用' : '停用' }}
              </span>
            </div>
            <p class="text-sm font-medium text-gray-800 mt-1 truncate m-0">{{ item.title }}</p>
            <p class="text-xs text-gray-400 mt-0.5 m-0">
              {{ item.source ? `📎 ${item.source}` : '' }}
              {{ item.createdAt ? ' · ' + formatDate(item.createdAt) : '' }}
            </p>
          </div>
          <div class="flex gap-1 shrink-0">
            <button
              class="px-2 py-1 text-xs text-blue-500 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border-none transition-colors"
              @click="openEdit(item)"
            >编辑</button>
            <button
              class="px-2 py-1 text-xs text-red-500 bg-red-50 rounded hover:bg-red-100 cursor-pointer border-none transition-colors"
              @click="handleDelete(item)"
            >删除</button>
          </div>
        </div>

        <div v-if="items.length === 0" class="text-center py-12 text-gray-400">
          <p>还没有资讯，点「新增资讯」创建一条</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import KnowledgeEditor from './KnowledgeEditor.vue'
import { CATEGORY_COLORS, KNOWLEDGE_CATEGORIES } from '@/types/knowledge'

const store = useKnowledgeStore()

const items = ref([])
const showForm = ref(false)
const editingItem = ref(null)

onMounted(async () => {
  await loadList()
})

async function loadList() {
  await store.fetchAdminList()
  items.value = store.items
}

function openCreate() {
  editingItem.value = null
  showForm.value = true
}

function openEdit(item) {
  editingItem.value = item
  showForm.value = true
}

async function handleSaved(data) {
  try {
    if (editingItem.value) {
      await store.update(editingItem.value.objectId, data)
    } else {
      await store.create(data)
    }
    showForm.value = false
    await loadList()
  } catch (e) {
    alert('保存失败: ' + (e.message || e))
  }
}

async function handleDelete(item) {
  if (!confirm(`确定删除「${item.title}」？`)) return
  try {
    await store.remove(item.objectId)
    await loadList()
  } catch (e) {
    alert('删除失败: ' + (e.message || e))
  }
}

function categoryLabel(val) {
  const c = KNOWLEDGE_CATEGORIES.find(c => c.value === val)
  return c ? c.label.replace(/^.\s*/, '') : val || '未分类'
}

function categoryColor(val) {
  return CATEGORY_COLORS[val] || 'bg-gray-50 text-gray-600'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}
</script>
