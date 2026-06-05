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

    <!-- 调试模式面板（管理后台底部） -->
    <div v-if="debugMode" class="mt-6 border border-gray-300 rounded-lg overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
        <span class="text-xs font-mono font-semibold text-gray-600">🧪 资讯调试面板</span>
      </div>
      <div class="p-3 bg-gray-50 text-xs space-y-2">
        <div class="flex gap-2">
          <button class="px-2 py-1 text-[11px] bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer border-none" @click="handleResetState">
            🔄 重置当天状态
          </button>
          <button class="px-2 py-1 text-[11px] bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer border-none" @click="handleForcePush">
            📤 测试推送
          </button>
          <button class="px-2 py-1 text-[11px] bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer border-none" @click="handleSeed">
            🌱 一键生成默认资讯
          </button>
          <button class="px-2 py-1 text-[11px] bg-yellow-500 text-white rounded hover:bg-yellow-600 cursor-pointer border-none" @click="handleMarkTest">
            🏷 标记旧数据
          </button>
          <button class="px-2 py-1 text-[11px] bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer border-none" @click="showJson = !showJson">
            📄 {{ showJson ? '隐藏' : '显示' }}全部 JSON
          </button>
        </div>
        <div class="text-[11px] text-gray-500 font-mono leading-relaxed">
          <div>items: {{ items.length }}条</div>
          <div>viewedIds: [{{ store.userState.viewedIds.join(', ') || '空' }}]</div>
          <div>favoriteIds: [{{ store.userState.favoriteIds.join(', ') || '空' }}]</div>
          <div>lastFetchDate: {{ store.userState.lastFetchDate || '(未设置)' }}</div>
          <div>dismissed: {{ store.userState.dismissed }}</div>
          <div>today: {{ store.today || '(未设置)' }}</div>
        </div>
        <pre v-if="showJson" class="mt-2 text-[10px] text-gray-400 bg-white p-2 rounded border overflow-x-auto max-h-60 whitespace-pre-wrap">{{ jsonPreview }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import KnowledgeEditor from './KnowledgeEditor.vue'
import { CATEGORY_COLORS, KNOWLEDGE_CATEGORIES } from '@/types/knowledge'

const store = useKnowledgeStore()

const items = ref([])
const showForm = ref(false)
const editingItem = ref(null)

// 调试
const debugMode = ref(false)
const showJson = ref(false)
const jsonPreview = computed(() => {
  if (items.value.length === 0) return '(空)'
  return JSON.stringify(items.value, null, 2).slice(0, 5000)
})

onMounted(async () => {
  debugMode.value = localStorage.getItem('mermaid-debug') === 'true'
  window.addEventListener('storage', onStorageChange)
  await loadList()
})

function onStorageChange() {
  debugMode.value = localStorage.getItem('mermaid-debug') === 'true'
}

function handleResetState() {
  if (!confirm('重置当天所有状态？(已读记录/收藏/关闭)')) return
  store.resetState()
}

async function handleForcePush() {
  await store.forcePush()
  alert('已重置状态并触发推送，请查看右下角卡片')
}

async function handleSeed() {
  if (!confirm('将生成 6 条默认示例资讯（图书馆/四六级/选课/学习技巧/冷知识/名言），继续？')) return
  const btn = document.activeElement
  if (btn) btn.textContent = '⏳ 生成中...'
  try {
    const results = await store.seedDefaultItems()
    await loadList()
    alert(`✅ 已生成 ${results.length} 条默认资讯，刷新首页即可查看`)
  } catch (e) {
    alert('生成失败: ' + (e.message || e))
  } finally {
    if (btn) btn.textContent = '🌱 一键生成默认资讯'
  }
}

async function handleMarkTest() {
  if (!confirm('将扫描所有已入库的资讯，为缺少标记的旧数据添加 🧪 前缀和"测试数据"标签，继续？')) return
  const btn = document.activeElement
  if (btn) btn.textContent = '⏳ 标记中...'
  try {
    const count = await store.markExistingTestItems()
    await loadList()
    alert(`✅ 已标记 ${count} 条数据，刷新首页即可看到效果`)
  } catch (e) {
    alert('标记失败: ' + (e.message || e))
  } finally {
    if (btn) btn.textContent = '🏷 标记旧数据'
  }
}

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
