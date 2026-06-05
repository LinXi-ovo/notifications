<template>
  <div class="max-w-4xl mx-auto p-4 sm:p-6">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">📋 任务系统</h1>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        @click="showCreateModal = true"
      >
        ＋ 新建任务
      </button>
    </div>

    <!-- 创建模态框 -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showCreateModal = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">新建任务</h2>
        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">任务标题</label>
        <input
          v-model="newMissionTitle"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
          placeholder="例如：2026 秋季评奖评优"
          @keyup.enter="createMission"
        />
        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showCreateModal = false">取消</button>
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newMissionTitle.trim()" @click="createMission">创建</button>
        </div>
      </div>
    </div>

    <!-- 导入区域 -->
    <div class="mb-6 flex items-center gap-2 text-sm">
      <label class="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer font-medium">
        📥 导入 JSON
        <input type="file" accept=".json" class="hidden" @change="onImportFile" />
      </label>
    </div>

    <!-- 任务列表 -->
    <div v-if="loading" class="text-center py-12 text-gray-400">
      <p class="text-lg">加载中...</p>
    </div>

    <div v-else-if="!missions.length" class="text-center py-16 text-gray-400 dark:text-gray-500">
      <p class="text-5xl mb-4">📋</p>
      <p class="text-lg mb-1">还没有任务</p>
      <p class="text-sm">点击"新建任务"开始使用</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="m in missions"
        :key="m.id"
        class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow cursor-pointer"
        @click="$router.push(`/mission/${m.id}`)"
      >
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100 leading-tight">{{ m.title }}</h3>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="statusClass(m.status)">
            {{ statusLabel(m.status) }}
          </span>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-2">创建于 {{ formatDate(m.createdAt) }}</p>
        <!-- 进度条 -->
        <ProgressBar :pct="m._progress || 0" :show-label="true" />
        <div class="flex justify-end gap-2 mt-2">
          <button class="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" @click.stop="deleteMission(m.id)">删除</button>
        </div>
      </div>
    </div>

    <!-- 回收站 -->
    <div v-if="missionStore.recycleBin.length" class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold text-gray-600 dark:text-gray-400">🗑️ 回收站</h2>
        <button
          class="text-xs px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          @click="emptyRecycleBin"
        >
          一键清空
        </button>
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">超过 30 天的条目会自动永久删除</p>
      <div class="space-y-2">
        <div
          v-for="item in missionStore.recycleBin"
          :key="item.id"
          class="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2.5 border border-gray-200 dark:border-gray-700"
        >
          <div>
            <span class="text-sm text-gray-600 dark:text-gray-300">{{ item.title }}</span>
            <span class="text-xs text-gray-400 dark:text-gray-500 ml-2">删除于 {{ formatDate(item.deletedAt) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-xs px-2 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded hover:bg-blue-200 transition-colors" @click="restoreMission(item.id)">↩️ 恢复</button>
            <button class="text-xs px-2 py-1 bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200 transition-colors" @click="permanentlyDelete(item.id)">永久删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'
import ProgressBar from '@/components/mission/ProgressBar.vue'

const missionStore = useMissionStore()
const userStore = useUserStore()

const showCreateModal = ref(false)
const newMissionTitle = ref('')
const loading = ref(false)

const missions = computed(() => {
  return missionStore.index.map(item => {
    // 尝试从 localStorage 读取完整数据以获取进度
    try {
      const raw = localStorage.getItem('mission:' + item.id)
      if (raw) {
        const data = JSON.parse(raw)
        const total = data.nodes?.length || 0
        const done = data.nodes?.filter(n => n.status === 'completed').length || 0
        return { ...item, _progress: total ? Math.round((done / total) * 100) : 0 }
      }
    } catch {}
    return { ...item, _progress: 0 }
  })
})

onMounted(() => {
  missionStore.fetchIndex()
})

function createMission() {
  if (!newMissionTitle.value.trim()) return
  const username = userStore.username || 'anonymous'
  missionStore.createMission(newMissionTitle.value.trim(), username)
  newMissionTitle.value = ''
  showCreateModal.value = false
}

function deleteMission(id) {
  if (confirm('确定删除此任务？可在回收站中恢复。')) {
    missionStore.deleteMission(id)
  }
}

function restoreMission(id) {
  missionStore.restoreMission(id)
}

function permanentlyDelete(id) {
  if (confirm('永久删除后将无法恢复，确定？')) {
    missionStore.permanentlyDeleteMission(id)
  }
}

function emptyRecycleBin() {
  if (confirm('确定清空回收站？所有条目将被永久删除，无法恢复。')) {
    missionStore.emptyRecycleBin()
  }
}

function onImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const result = missionStore.importMission(ev.target.result)
    if (result) {
      alert('导入成功！')
    } else if (missionStore.error) {
      alert(missionStore.error)
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function statusClass(status) {
  if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
}
function statusLabel(status) {
  return status === 'active' ? '进行中' : '已归档'
}
function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}
</script>
