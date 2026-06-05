<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-4xl mx-auto px-4 py-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4 m-0">管理后台</h2>

      <!-- 非管理员提示 -->
      <div v-if="!userStore.isAdmin" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
        需要管理员权限才能管理通知。
        <router-link to="/" class="text-blue-500">返回首页</router-link>
      </div>

      <template v-if="userStore.isAdmin">

        <!-- 选项卡 -->
        <div class="flex gap-1 mb-4 border-b border-gray-200">
          <button
            class="px-4 py-2 text-sm font-medium rounded-t cursor-pointer border-none transition-colors"
            :class="activeTab === 'notifications' ? 'bg-white text-blue-600 border border-b-white border-gray-200 -mb-px' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'notifications'; showForm = false"
          >
            📰 通知管理
          </button>
          <button
            class="px-4 py-2 text-sm font-medium rounded-t cursor-pointer border-none transition-colors"
            :class="activeTab === 'users' ? 'bg-white text-blue-600 border border-b-white border-gray-200 -mb-px' : 'text-gray-500 hover:text-gray-700'"
            @click="activeTab = 'users'"
          >
            👥 管理员管理（{{ users.length }} 人）
          </button>
          <button
            class="px-4 py-2 text-sm font-medium rounded-t cursor-pointer border-none transition-colors"
            :class="activeTab === 'trash' ? 'bg-white text-red-500 border border-b-white border-gray-200 -mb-px' : 'text-gray-500 hover:text-gray-700'"
            @click="openTrash"
          >
            🗑️ 回收站（{{ trashCount }}）
          </button>
        </div>

        <!-- ════ 通知管理标签 ════ -->
        <div v-if="activeTab === 'notifications'">
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
            <div class="flex gap-2">
              <button class="px-3 py-1.5 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer" @click="exportJSON">📥 导出 JSON</button>
              <button class="px-3 py-1.5 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer" @click="exportHTML">📄 导出 HTML</button>
              <button class="px-3 py-1.5 text-sm text-purple-600 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 cursor-pointer" @click="openAiGenerator">🤖 AI 生成</button>
              <button class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 cursor-pointer border-none" @click="openCreate">＋ 新建通知</button>
            </div>
          </div>

          <!-- 通知列表 -->
          <div v-if="!showForm" class="space-y-2">
            <div v-for="item in store.list" :key="item.id" class="bg-white rounded-lg border p-4 flex items-start justify-between gap-4 cursor-pointer hover:shadow-md transition-shadow" @click="previewItem = item">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs px-1.5 py-0.5 rounded" :class="typeClass(item.type)">{{ typeIcon(item.type) }} {{ item.type }}</span>
                  <span v-if="item.priority > 0" class="text-xs text-yellow-600">⭐ 置顶</span>
                </div>
                <p class="text-sm font-medium text-gray-800 mt-1 truncate m-0">{{ item.title }}</p>
                <p class="text-xs text-gray-400 mt-1 m-0">{{ formatDate(item.createdAt) }}</p>
              </div>
              <div class="flex gap-1 shrink-0" @click.stop>
                <button class="px-2 py-1 text-xs text-blue-500 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border-none" @click="openEdit(item)">编辑</button>
                <button class="px-2 py-1 text-xs text-red-500 bg-red-50 rounded hover:bg-red-100 cursor-pointer border-none" @click="trashItem(item)">🗑️</button>
              </div>
            </div>
            <div v-if="store.list.length === 0" class="text-center py-12 text-gray-400">
              <p>还没有通知</p>
            </div>
          </div>

          <!-- 预览弹窗 -->
          <div v-if="previewItem" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="previewItem = null">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-bold text-gray-800 m-0 truncate pr-4">{{ previewItem.title }}</h3>
                <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl shrink-0" @click="previewItem = null">✕</button>
              </div>
              <div class="px-6 py-4 overflow-y-auto space-y-4 flex-1">
                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <span class="px-2 py-0.5 rounded" :class="typeClass(previewItem.type)">{{ typeIcon(previewItem.type) }} {{ previewItem.type || '未分类' }}</span>
                  <span v-if="previewItem.priority > 0">⭐ 置顶</span>
                  <span>{{ formatDate(previewItem.createdAt) }}</span>
                  <span v-if="previewItem.sourceGroup">📢 {{ previewItem.sourceGroup }}</span>
                  <span v-if="previewItem.sourcePerson">👤 {{ previewItem.sourcePerson }}</span>
                </div>
                <div class="prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline" v-html="previewItem.content"></div>
                <div v-if="previewItem.tags?.length" class="flex gap-1 flex-wrap">
                  <span v-for="t in previewItem.tags" :key="t" class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">#{{ t }}</span>
                </div>
                <div v-if="previewItem.originalLink" class="text-sm">
                  <a :href="previewItem.originalLink" target="_blank" class="text-blue-500 no-underline">🔗 原文链接</a>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button class="px-3 py-1.5 text-sm text-blue-500 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer border-none" @click="openEdit(previewItem); previewItem = null">编辑</button>
                <button class="px-3 py-1.5 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer" @click="previewItem = null">关闭</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ════ 管理员管理标签 ════ -->
        <div v-if="activeTab === 'users'">
          <!-- 初始管理员注册引导 -->
          <div v-if="needsAdminInit" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-700 flex items-center justify-between">
            <span>需要将当前账号注册为系统管理员</span>
            <button class="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 cursor-pointer border-none" @click="initAdminRole">
              注册为管理员
            </button>
          </div>
          <div class="space-y-2">
            <div
              v-for="u in users"
              :key="u.id"
              class="bg-white rounded-lg border px-4 py-3 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-800">{{ u.username }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded" :class="u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'">
                  {{ u.role === 'admin' ? '管理员' : '用户' }}
                </span>
                <span v-if="u.email && (userStore.isSuperAdmin || u.username === userStore.username)" class="text-xs text-gray-400">{{ u.email }}</span>
              </div>
              <button
                v-if="userStore.isSuperAdmin && u.username !== userStore.username"
                class="text-xs px-2 py-1 rounded cursor-pointer border-none"
                :class="u.role === 'admin' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'"
                @click="toggleRole(u)"
              >
                {{ u.role === 'admin' ? '取消管理' : '设为管理' }}
              </button>
              <span v-else-if="u.username === userStore.username" class="text-xs text-gray-400">当前账号</span>
              <span v-else class="text-xs text-gray-400">仅 admin 可管理</span>
            </div>
          </div>
        </div>

        <!-- ════ 回收站 ════ -->
        <div v-if="activeTab === 'trash'" class="space-y-0">
          <div v-if="trashItems.length === 0" class="text-center py-12 text-gray-400">
            <p>回收站是空的</p>
          </div>
          <template v-for="(group, date) in trashByDate" :key="date">
            <h4 class="text-sm text-gray-500 mt-4 mb-2 sticky top-0 bg-gray-50 py-1">{{ date }}</h4>
            <div v-for="item in group" :key="item.id" class="bg-white rounded-lg border px-4 py-3 mb-2 flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 truncate m-0">{{ item.title }}</p>
                <p class="text-xs text-gray-400 mt-0.5 m-0">{{ formatDate(item.createdAt) }}</p>
              </div>
              <div class="flex gap-2 shrink-0">
                <button class="text-xs px-2 py-1 text-green-500 bg-green-50 rounded hover:bg-green-100 cursor-pointer border-none" @click="restoreItem(item)">↩ 恢复</button>
                <button class="text-xs px-2 py-1 text-red-500 bg-red-100 rounded hover:bg-red-200 cursor-pointer border-none" @click="permaDelete(item)">永久删除</button>
              </div>
            </div>
          </template>
          <p v-if="trashItems.length > 0" class="text-xs text-gray-400 text-center pt-4">超过 30 天的通知会自动永久删除</p>
        </div>

      </template>

      <!-- AI 生成 -->
      <AiGenerator
        v-if="showAiGenerator"
        :categories="categories"
        @close="showAiGenerator = false"
        @apply="handleAiResult"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { deleteNotification, getNotifications, getTrashNotifications, restoreNotification, permanentlyDeleteNotification, cleanExpiredTrash } from '@/api/notification'
import { getCategories } from '@/api/category'
import { getAllUsers, setUserRole } from '@/api/user'
import NotificationForm from '@/components/NotificationForm.vue'
import AiGenerator from '@/components/AiGenerator.vue'

const router = useRouter()
const userStore = useUserStore()
const store = useNotificationStore()

const showForm = ref(false)
const editingNotification = ref(null)
const previewItem = ref(null)
const users = ref([])
const showUserManager = ref(false)
const activeTab = ref('notifications')
const showAiGenerator = ref(false)
const categories = ref([])
const trashItems = ref([])
const trashCount = computed(() => trashItems.value.length)

const trashByDate = computed(() => {
  const groups = {}
  trashItems.value.forEach(item => {
    const d = item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('zh-CN') : '未知'
    if (!groups[d]) groups[d] = []
    groups[d].push(item)
  })
  return groups
})

const needsAdminInit = computed(() => {
  // admin 账号还没在 UserRoles 表注册时显示引导
  const me = users.value.find(u => u.username === userStore.username)
  return me && me.role !== 'admin'
})

onMounted(() => {
  store.fetchList({ pageSize: 100 })
  loadUsers()
  loadCategories()
  cleanExpiredTrash()
})

async function loadUsers() {
  try {
    users.value = await getAllUsers()
  } catch (e) {
    console.error('加载用户列表失败:', e)
  }
}

async function loadCategories() {
  try {
    categories.value = await getCategories()
  } catch (e) {
    console.error('加载分类失败:', e)
  }
}

function openAiGenerator() {
  showAiGenerator.value = true
}

function handleAiResult(data) {
  // 切换到通知管理并打开编辑表单
  activeTab.value = 'notifications'
  showForm.value = true
  showAiGenerator.value = false
  editingNotification.value = data
}

async function toggleRole(u) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  if (!confirm(`确定${newRole === 'admin' ? '将' : '取消'}"${u.username}"${newRole === 'admin' ? '设为管理员' : '的管理员权限'}？`)) return
  try {
    await setUserRole(u.id, newRole, u.username)
    u.role = newRole
  } catch (e) {
    alert('操作失败: ' + (e.message || e))
  }
}

async function initAdminRole() {
  try {
    const me = users.value.find(u => u.username === userStore.username)
    if (!me) return
    await setUserRole(me.id, 'admin', me.username)
    me.role = 'admin'
    // 刷新 store 里的角色
    userStore.refresh()
  } catch (e) {
    alert('注册失败: ' + (e.message || e))
  }
}

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

// ── 回收站操作 ──
function trashItem(item) {
  deleteNotification(item.id).then(() => {
    store.fetchList({ pageSize: 100 })
    loadTrash() // 刷新回收站数量
  }).catch(e => {
    alert('删除失败: ' + (e.message || e))
  })
}

async function loadTrash() {
  try {
    trashItems.value = await getTrashNotifications()
  } catch (e) {
    console.error('加载回收站失败:', e)
  }
}

function openTrash() {
  activeTab.value = 'trash'
  loadTrash()
}

function restoreItem(item) {
  restoreNotification(item.id).then(() => {
    trashItems.value = trashItems.value.filter(i => i.id !== item.id)
    store.fetchList({ pageSize: 100 })
  }).catch(e => {
    alert('恢复失败: ' + (e.message || e))
  })
}

function permaDelete(item) {
  permanentlyDeleteNotification(item.id).then(() => {
    trashItems.value = trashItems.value.filter(i => i.id !== item.id)
  }).catch(e => {
    alert('删除失败: ' + (e.message || e))
  })
}

// ── 数据导出 ──
async function getAllData() {
  // 获取所有通知（不分页）
  const { data: notifications } = await getNotifications({ pageSize: 1000 })
  const categories = await getCategories()
  return { notifications, categories, exportedAt: new Date().toISOString() }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function exportJSON() {
  try {
    const data = await getAllData()
    const json = JSON.stringify(data, null, 2)
    downloadFile(json, `通知聚合_备份_${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
  } catch (e) {
    alert('导出失败: ' + (e.message || e))
  }
}

async function exportHTML() {
  try {
    const { notifications, categories } = await getAllData()

    const catMap = {}
    categories.forEach(c => { catMap[c.value] = c })

    const itemsHtml = notifications.map(n => {
      const cat = catMap[n.type]
      const icon = cat ? cat.icon : '📌'
      const tags = (n.tags || []).map(t => `<span class="tag">#${t}</span>`).join('')
      return `
        <article>
          <h2>${icon} ${escapeHtml(n.title)}</h2>
          <div class="meta">${n.sourcePerson || ''}${n.sourcePerson && n.sourceGroup ? ' · ' : ''}${n.sourceGroup || ''} · ${n.createdAt ? new Date(n.createdAt).toLocaleDateString('zh-CN') : ''}</div>
          <div class="content">${n.content || ''}</div>
          ${tags ? `<div class="tags">${tags}</div>` : ''}
          ${n.originalLink ? `<a href="${n.originalLink}" class="source-link" target="_blank">🔗 原文链接</a>` : ''}
          <hr/>
        </article>`
    }).join('\n')

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>通知聚合 — 导出</title>
<style>
  body { font-family: -apple-system, 'PingFang SC', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
  article { background: #fff; padding: 20px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  h1 { color: #333; }
  h2 { margin: 0 0 8px; font-size: 18px; color: #222; }
  .meta { font-size: 13px; color: #999; margin-bottom: 12px; }
  .content { font-size: 15px; line-height: 1.7; color: #444; }
  .content img { max-width: 100%; border-radius: 4px; }
  .tags { margin-top: 8px; }
  .tag { display: inline-block; font-size: 12px; background: #f0f0f0; color: #666; padding: 2px 8px; border-radius: 3px; margin-right: 4px; }
  .source-link { display: inline-block; margin-top: 8px; font-size: 13px; color: #3b82f6; }
  hr { border: none; border-top: 1px solid #eee; margin: 0; }
  .footer { text-align: center; color: #aaa; font-size: 13px; padding: 20px 0; }
</style>
</head>
<body>
<h1>📢 通知聚合 — 数据导出</h1>
<p style="color:#999;font-size:14px">导出时间: ${new Date().toLocaleString('zh-CN')} · 共 ${notifications.length} 条通知</p>
${itemsHtml}
<div class="footer">由 通知聚合器 导出</div>
</body>
</html>`

    downloadFile(html, `通知聚合_导出_${new Date().toISOString().slice(0, 10)}.html`, 'text/html; charset=utf-8')
  } catch (e) {
    alert('导出失败: ' + (e.message || e))
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ── Mermaid 渲染 ──
watch(previewItem, async (item) => {
  if (!item) return
  await nextTick()
  await nextTick() // v-html 可能跨两个 tick
  const container = document.querySelector('.fixed.inset-0.z-50')
  if (!container) return
  const mermaids = container.querySelectorAll('[data-mermaid]')
  if (!mermaids?.length) return
  try {
    const mod = await import('mermaid')
    const mermaid = mod.default || mod
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    mermaids.forEach(async (el) => {
      if (el.classList.contains('mermaid-rendered')) return
      const raw = el.getAttribute('data-mermaid') || ''
      const code = raw.replace(/^```(?:mermaid)?\s*/gm, '').replace(/```\s*$/gm, '').trim()
      if (!code) return
      try {
        const id = `ap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const { svg } = await mermaid.render(id, code)
        el.innerHTML = svg
        el.classList.add('mermaid-rendered')
        const svgEl = el.querySelector('svg')
        if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
      } catch (e) {
        el.innerHTML = `<pre class="text-xs text-red-500 p-2 bg-red-50 rounded">⚠️ 流程图渲染失败: ${e.message}</pre>`
      }
    })
  } catch (e) {
    console.error('Mermaid 加载失败:', e)
  }
})

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
