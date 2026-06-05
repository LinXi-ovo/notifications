<template>
  <div class="max-w-4xl mx-auto p-4 sm:p-6">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">📋 任务系统</h1>
        <!-- 同步状态 -->
        <span v-if="missionStore.migrated" class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
          ☁️ 云端
        </span>
        <span v-else-if="migrating" class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
          ⏳ 同步中…
        </span>
        <span v-else class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
          💾 本地
        </span>
        <!-- 管理员：发布到云端 -->
        <button
          v-if="!missionStore.migrated && userStore.isAdmin"
          class="text-xs px-3 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors font-medium"
          :disabled="migrating"
          @click="publishToCloud"
        >
          {{ migrating ? '⏳ 发布中…' : '☁️ 发布任务到云端' }}
        </button>
      </div>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        @click="showCreateModal = true"
      >
        ＋ 新建任务
      </button>
    </div>
    <p v-if="missionStore.bmobLoadError" class="text-xs text-orange-500 mb-4">⚠️ {{ missionStore.bmobLoadError }}</p>

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
      <button class="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium" @click="showAiImport = true">
        🤖 AI 导入
      </button>
    </div>

    <!-- AI 导入模态框 -->
    <div v-if="showAiImport" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAiImport = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">🤖 AI 生成任务</h2>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="showAiImport = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4 space-y-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            将 AI 按照 <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">doc/skills/任务生成助手.md</code> 规范生成的 JSON 粘贴到下方，系统将自动解析并创建任务。
          </p>
          <textarea
            v-model="aiJsonInput"
            rows="12"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
            placeholder='将 AI 输出的 JSON 粘贴到这里...'
          ></textarea>
          <p v-if="aiError" class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{{ aiError }}</p>
          <p v-if="aiSuccess" class="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">✅ {{ aiSuccess }}</p>
          <details class="text-xs text-gray-400">
            <summary class="cursor-pointer hover:text-gray-600">💡 没有 AI？粘贴示例 JSON 试试</summary>
            <pre class="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-x-auto text-[10px] leading-relaxed">{{ exampleJson }}</pre>
          </details>
        </div>
        <div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showAiImport = false">取消</button>
          <button class="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50" :disabled="!aiJsonInput.trim()" @click="submitAiImport">🤖 解析并创建</button>
        </div>
      </div>
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
import { useRouter } from 'vue-router'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'
import { parseAiMission } from '@/utils/ai-mission-parser'
import ProgressBar from '@/components/mission/ProgressBar.vue'

const router = useRouter()
const missionStore = useMissionStore()
const userStore = useUserStore()

const showCreateModal = ref(false)
const newMissionTitle = ref('')
const loading = ref(false)
const migrating = ref(false)

// AI 导入
const showAiImport = ref(false)
const aiJsonInput = ref('')
const aiError = ref('')
const aiSuccess = ref('')
const exampleJson = `{
  "title": "综测信息收集",
  "description": "学生填写 → 班长汇总 → 辅导员审核",
  "tags": ["综测", "学期任务"],
  "roles": [
    { "name": "普通成员", "color": "#3B82F6", "emoji": "🟢", "claimPolicy": "free", "maxAssignees": 30 },
    { "name": "班长", "color": "#F59E0B", "emoji": "👨‍🎓", "claimPolicy": "free" },
    { "name": "辅导员", "color": "#EF4444", "emoji": "🔴", "claimPolicy": "delegated" }
  ],
  "nodes": [
    {
      "title": "填写信息表",
      "description": "登录系统填写个人信息",
      "assignedRole": "普通成员",
      "completionRule": "count",
      "completionTarget": 30,
      "deadline": "2026-06-15T23:59:59.000Z"
    },
    {
      "title": "班长汇总提交",
      "description": "汇总后提交给辅导员",
      "assignedRole": "班长",
      "completionRule": "single",
      "completionTarget": 1,
      "dependsOn": ["填写信息表"]
    },
    {
      "title": "辅导员审核",
      "description": "审核汇总材料",
      "assignedRole": "辅导员",
      "completionRule": "single",
      "completionTarget": 1,
      "dependsOn": ["班长汇总提交"]
    }
  ]
}`

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

onMounted(async () => {
  // 如果尚未迁移到 Bmob，尝试迁移
  if (!missionStore.migrated) {
    migrating.value = true
    await missionStore.migrateLocalToBmob()
    migrating.value = false
  }
  // 加载索引（Bmob 优先 → localStorage 兜底）
  await missionStore.fetchIndex()
})

async function createMission() {
  if (!newMissionTitle.value.trim()) return
  const username = userStore.username || 'anonymous'
  await missionStore.createMission(newMissionTitle.value.trim(), username)
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

// ── AI 导入 ──
function submitAiImport() {
  aiError.value = ''
  aiSuccess.value = ''

  try {
    const mission = parseAiMission(aiJsonInput.value)
    // 让当前用户认领第一个角色
    if (userStore.username && mission.roles[0]) {
      mission.assignments.push({
        roleId: mission.roles[0].id,
        userId: userStore.username,
        assignedAt: new Date().toISOString(),
        status: 'approved'
      })
    }
    // 写入 store
    missionStore.currentMission = mission
    missionStore._saveMission()
    missionStore.index.push({
      id: mission.id,
      title: mission.title,
      status: mission.status,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt
    })
    missionStore._updateIndex()

    aiSuccess.value = `"${mission.title}" 创建成功！即将跳转... (${mission.nodes.length} 个节点，${mission.roles.length} 个角色)`
    setTimeout(() => {
      showAiImport.value = false
      aiJsonInput.value = ''
      aiSuccess.value = ''
      router.push('/mission/' + mission.id)
    }, 1500)
  } catch (e) {
    aiError.value = e.message
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

/** 管理员：发布所有本地任务到云端 */
async function publishToCloud() {
  if (!confirm('将所有本地任务发布到云端，让其他用户也能看到？')) return
  migrating.value = true
  await missionStore.migrateLocalToBmob()
  migrating.value = false
  // 刷新列表以显示云端状态
  await missionStore.fetchIndex()
}
</script>
