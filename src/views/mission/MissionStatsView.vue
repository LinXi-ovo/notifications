<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-6">
    <!-- 头部 -->
    <div class="flex items-center gap-3 mb-6">
      <button class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" @click="$router.push(`/mission/${mission?.id}`)">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100">📊 完成统计</h1>
      <h2 v-if="mission" class="text-sm text-gray-500 dark:text-gray-400">— {{ mission.title }}</h2>
    </div>

    <!-- 加载/错误状态 -->
    <div v-if="missionStore.loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else-if="!mission" class="text-center py-12 text-gray-400">任务不存在</div>

    <template v-else>
      <!-- 总览卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">整体进度</p>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-gray-800 dark:text-gray-100">{{ progress.pct }}%</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ progress.done }}/{{ progress.total }} 节点</span>
          </div>
          <div class="mt-2">
            <ProgressBar :pct="progress.pct" :show-label="false" />
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">完成节点</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.completedCount }}</p>
          <p class="text-xs text-gray-400 mt-1">占全部节点的 {{ stats.completedPct }}%</p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">待处理节点</p>
          <p class="text-3xl font-bold text-yellow-600">{{ stats.pendingCount }}</p>
          <p class="text-xs text-gray-400 mt-1">需继续推进</p>
        </div>
      </div>

      <!-- 按角色统计 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">👥 按角色聚合</h3>
        <div class="space-y-3">
          <div v-for="r in rolesStats" :key="r.roleId" class="flex items-center gap-4">
            <div class="w-28 shrink-0 text-sm text-gray-700 dark:text-gray-200 truncate" :title="r.roleName">
              {{ r.emoji }} {{ r.roleName }}
            </div>
            <div class="flex-1">
              <ProgressBar :pct="r.pct" :show-label="true" :height="'h-3'" />
            </div>
            <div class="w-20 text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
              {{ r.done }}/{{ r.total }} 节点
            </div>
          </div>
          <div v-if="!rolesStats.length" class="text-sm text-gray-400 text-center py-3">无角色数据</div>
        </div>
      </div>

      <!-- 节点状态矩阵 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">📋 节点状态明细</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">节点</th>
                <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">角色</th>
                <th class="text-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                <th class="text-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">完成模式</th>
                <th class="text-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">完成进度</th>
                <th class="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">截止日期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in sortedNodes" :key="n.id" class="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                <td class="px-3 py-2.5 text-gray-800 dark:text-gray-200 font-medium">{{ n.title }}</td>
                <td class="px-3 py-2.5">
                  <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {{ getRoleName(n.assignedRole) }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                  <StatusBadge :status="n.status" :size="'sm'" />
                </td>
                <td class="px-3 py-2.5 text-center text-xs text-gray-500">
                  {{ completionLabel(n) }}
                </td>
                <td class="px-3 py-2.5 text-center text-xs text-gray-500 tabular-nums">
                  <span v-if="n.completionRule !== 'single'">{{ n.completions.length }}/{{ n.completionRule === 'count' ? n.completionTarget : '全员' }}</span>
                  <span v-else>{{ n.completions.length ? '✅' : '—' }}</span>
                </td>
                <td class="px-3 py-2.5 text-right text-xs" :class="deadlineClass(n.deadline)">
                  {{ n.deadline ? formatDate(n.deadline) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 完成时间线 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">🕐 最近完成</h3>
        <div v-if="recentCompletions.length" class="space-y-2">
          <div v-for="c in recentCompletions" :key="`${c.nodeId}-${c.completedAt}`" class="flex items-center gap-3 text-sm">
            <span class="text-green-600">✅</span>
            <span class="text-gray-600 dark:text-gray-300 font-medium">{{ c.nodeTitle }}</span>
            <span class="text-gray-400">— {{ c.userName || c.userId }}</span>
            <span class="text-xs text-gray-400 ml-auto">{{ formatTime(c.completedAt) }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400 text-center py-4">暂无完成记录</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMissionStore } from '@/stores/mission'
import ProgressBar from '@/components/mission/ProgressBar.vue'
import StatusBadge from '@/components/mission/StatusBadge.vue'

const route = useRoute()
const router = useRouter()
const missionStore = useMissionStore()

const mission = computed(() => missionStore.currentMission)

const progress = computed(() => missionStore.progress)

/** 统计衍生数据 */
const stats = computed(() => {
  if (!mission.value) return { completedCount: 0, pendingCount: 0, completedPct: '0' }
  const nodes = mission.value.nodes || []
  const total = nodes.length
  const completed = nodes.filter(n => n.status === 'completed').length
  const pending = nodes.filter(n => n.status !== 'completed' && n.status !== 'cancelled').length
  return {
    completedCount: completed,
    pendingCount: pending,
    completedPct: total ? Math.round((completed / total) * 100) + '%' : '0%'
  }
})

/** 按角色聚合 */
const rolesStats = computed(() => {
  if (!mission.value) return []
  return (mission.value.roles || []).map(r => {
    const nodes = (mission.value.nodes || []).filter(n => n.assignedRole === r.id)
    const total = nodes.length
    const done = nodes.filter(n => n.status === 'completed').length
    return {
      roleId: r.id,
      roleName: r.name,
      emoji: r.emoji,
      total,
      done,
      pct: total ? Math.round((done / total) * 100) : 0
    }
  }).filter(r => r.total > 0)
})

/** 排序节点 */
const sortedNodes = computed(() => {
  if (!mission.value) return []
  return [...(mission.value.nodes || [])].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
})

/** 最近完成记录 */
const recentCompletions = computed(() => {
  if (!mission.value) return []
  const records = []
  for (const n of mission.value.nodes || []) {
    if (!n.completions?.length) continue
    for (const c of n.completions) {
      records.push({
        nodeId: n.id,
        nodeTitle: n.title,
        userId: c.userId,
        userName: c.userName || c.userId,
        completedAt: c.completedAt
      })
    }
  }
  return records.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 20)
})

function getRoleName(roleId) {
  return mission.value?.roles.find(r => r.id === roleId)?.name || roleId
}

function completionLabel(node) {
  if (node.completionRule === 'single') return '单人'
  if (node.completionRule === 'count') return `多人(${node.completionTarget})`
  return '全员'
}

function deadlineClass(d) {
  if (!d) return 'text-gray-400'
  const diff = new Date(d) - Date.now()
  if (diff < 0) return 'text-red-500 font-medium'
  if (diff < 86400000 * 3) return 'text-orange-500'
  return 'text-gray-500'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  const id = route.params.id
  if (id) await missionStore.loadMission(id)
})
</script>
