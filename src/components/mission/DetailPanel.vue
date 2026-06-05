<template>
  <div class="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl rounded-t-2xl max-h-[60vh] overflow-y-auto transition-transform" @click.self="$emit('close')">
    <div class="max-w-4xl mx-auto p-4">
      <!-- 面板头部 -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ node.title }}</h3>
          <StatusBadge :status="node.status" :size="'sm'" />
          <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {{ getRoleName(node.assignedRole) }}
          </span>
        </div>
        <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="$emit('close')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- 描述 -->
      <p v-if="node.description" class="text-sm text-gray-600 dark:text-gray-300 mb-3">{{ node.description }}</p>
      <p v-else class="text-sm text-gray-400 dark:text-gray-500 mb-3">暂无描述</p>

      <!-- 进度（count/all 模式） -->
      <div v-if="node.completionRule !== 'single'" class="mb-3">
        <div class="flex items-center justify-between text-sm mb-1">
          <span class="text-gray-600 dark:text-gray-300">完成进度</span>
          <span class="text-gray-500 dark:text-gray-400 tabular-nums">{{ node.completions.length }}/{{ completionTargetDisplay }}</span>
        </div>
        <ProgressBar :pct="completionPct" :show-label="false" />
        <!-- 达标标记 -->
        <div v-if="node.completions.length > 0 && node.status !== 'completed'" class="mt-1 text-xs">
          <span class="text-green-600 dark:text-green-400 font-medium">📊 达标</span>
          <span class="text-gray-400 ml-1">已达最低完成人数，下游节点可开始</span>
        </div>
        <!-- 已完成列表 -->
        <div v-if="node.completions.length" class="mt-2 flex flex-wrap gap-1">
          <span v-for="c in node.completions" :key="c.userId" class="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">✅ {{ c.userName || c.userId }}</span>
        </div>
      </div>

      <!-- 前置/后置 -->
      <div class="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <div>
          <span class="font-medium">前置:</span>
          <span v-if="predecessors.length">
            <a v-for="(n, i) in predecessors" :key="n.id" href="#" class="text-blue-500 hover:underline" @click.prevent="$emit('select-node', n.id)">{{ n.title }}{{ i < predecessors.length - 1 ? ', ' : '' }}</a>
          </span>
          <span v-else class="text-gray-400">无</span>
        </div>
        <div>
          <span class="font-medium">后置:</span>
          <span v-if="successors.length">
            <a v-for="(n, i) in successors" :key="n.id" href="#" class="text-blue-500 hover:underline" @click.prevent="$emit('select-node', n.id)">{{ n.title }}{{ i < successors.length - 1 ? ', ' : '' }}</a>
          </span>
          <span v-else class="text-gray-400">无</span>
        </div>
      </div>

      <!-- 角色认领 + 权限信息 -->
      <div class="mb-3 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
            👤 {{ getRoleName(node.assignedRole) }}
            <span v-if="hasClaimedRole(node.assignedRole)" class="ml-1 text-xs text-green-500">✅ 已认领</span>
            <span v-else-if="hasPendingClaimForRole(node.assignedRole)" class="ml-1 text-xs text-orange-500">⏳ 审核中</span>
            <span v-else-if="claimPolicyForRole(node.assignedRole) === 'delegated'" class="ml-1 text-xs text-gray-400">🔒 委派制</span>
            <span v-else class="ml-1 text-xs text-gray-400">未认领</span>
          </span>
          <button
            v-if="!hasClaimedRole(node.assignedRole) && !hasPendingClaimForRole(node.assignedRole) && claimPolicyForRole(node.assignedRole) !== 'delegated'"
            class="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 transition-colors"
            @click="claimCurrentRole"
          >
            认领此角色
          </button>
          <span v-else-if="hasPendingClaimForRole(node.assignedRole)" class="text-xs text-orange-500 dark:text-orange-400">⏳ 等待管理员审核</span>
          <span v-else-if="hasClaimedRole(node.assignedRole)" class="text-xs text-green-600 dark:text-green-400">✅ 已认领</span>
          <span v-else class="text-xs text-gray-400">🔒 仅管理员可委派</span>
        </div>
        <div v-if="hasClaimedRole(node.assignedRole)" class="text-xs text-gray-400">
          你的角色: {{ userRoleNames.join(', ') }}
        </div>
      </div>

      <!-- 节点权限提示（执行模式） -->
      <div v-if="!editMode" class="flex items-center gap-2 text-xs">
        <span v-if="hasClaimedRole(node.assignedRole) && !isLocked" class="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 font-medium">🟢 可操作</span>
        <span v-else-if="hasClaimedRole(node.assignedRole) && isLocked" class="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-500 font-medium">🔒 角色无权限</span>
        <span v-else-if="hasPendingClaimForRole(node.assignedRole)" class="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 font-medium">⏳ 认领审核中</span>
        <span v-else class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 font-medium">🔒 请先认领角色</span>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <!-- 编辑模式 → 全部状态转换可用 -->
        <template v-if="editMode">
          <button
            v-for="t in allTransitionsForNode"
            :key="t.to"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors font-medium"
            :class="transitionButtonClass(t.to)"
            @click="changeStatus(t.to)"
          >
            {{ t.label }}
          </button>
          <button class="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" @click="deleteSelectedNode">
            🗑️ 删除节点
          </button>
        </template>

        <!-- 执行模式 → 按角色权限显示 -->
        <template v-else>
          <!-- 🔒 锁定：不显示任何操作按钮 -->
          <template v-if="isLocked">
            <span class="text-xs text-gray-400 italic">🔒 未认领该角色，无法操作</span>
          </template>
          <!-- 🟢 可操作：显示权限允许的转换按钮 -->
          <template v-else>
            <button
              v-for="t in permissionedTransitions"
              :key="t.to"
              class="px-3 py-1.5 text-sm rounded-lg transition-colors font-medium"
              :class="transitionButtonClass(t.to)"
              @click="changeStatus(t.to)"
            >
              {{ t.label }}
            </button>

            <!-- 无可用操作 → 显示具体原因 -->
            <span v-if="!permissionedTransitions.length" class="text-xs italic text-gray-400">
              {{ noOpReason }}
            </span>

            <!-- 标记我已填写（count/all 模式下额外按钮，仅进行中） -->
            <button
              v-if="node.status === 'in-progress' && node.completionRule !== 'single' && hasClaimedRole(node.assignedRole)"
              class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg transition-colors font-medium"
              @click="markNodeComplete"
            >
              ✅ 标记我已填写
            </button>
            <span v-else-if="node.status === 'in-progress' && node.completionRule !== 'single' && !hasClaimedRole(node.assignedRole)" class="text-xs text-gray-400 italic">
              请先认领角色，再点击「标记我已填写」
            </span>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'
import ProgressBar from './ProgressBar.vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps({
  node: { type: Object, required: true },
  editMode: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'select-node'])

const missionStore = useMissionStore()
const userStore = useUserStore()

// ── 辅助函数 ──

function getRoleName(roleId) {
  return missionStore.currentMission?.roles.find(r => r.id === roleId)?.name || roleId
}

function statusLabel(s) {
  const map = { 'todo': '未开始', 'in-progress': '进行中', 'completed': '已完成', 'blocked': '阻塞', 'cancelled': '已取消' }
  return map[s] || s
}

function transitionButtonClass(to) {
  if (to === 'completed') return 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
  if (to === 'blocked' || to === 'cancelled') return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
}

// ── 角色认领相关 ──

function hasClaimedRole(roleId) {
  const username = userStore.username
  if (!username) return false
  return !!missionStore.currentMission?.assignments.find(
    a => a.roleId === roleId && a.userId === username && a.status === 'approved'
  )
}

function hasPendingClaimForRole(roleId) {
  const username = userStore.username
  if (!username) return false
  return !!missionStore.currentMission?.assignments.find(
    a => a.roleId === roleId && a.userId === username && a.status === 'pending'
  )
}

function claimPolicyForRole(roleId) {
  if (!missionStore.currentMission) return 'free'
  const role = missionStore.currentMission.roles.find(r => r.id === roleId)
  return role?.claimPolicy?.type || 'free'
}

/** 当前用户已认领的角色名称列表 */
const userRoleNames = computed(() => {
  if (!missionStore.currentMission || !userStore.username) return []
  const assignments = missionStore.getUserAssignments(userStore.username)
  return assignments.map(a => {
    const role = missionStore.currentMission.roles.find(r => r.id === a.roleId)
    return role ? `${role.emoji} ${role.name}` : a.roleId
  })
})

// ── 前置/后置节点 ──

const predecessors = computed(() => {
  if (!props.node || !missionStore.currentMission) return []
  const edgeIds = missionStore.currentMission.edges.filter(e => e.target === props.node.id).map(e => e.source)
  return missionStore.currentMission.nodes.filter(n => edgeIds.includes(n.id))
})

const successors = computed(() => {
  if (!props.node || !missionStore.currentMission) return []
  const edgeIds = missionStore.currentMission.edges.filter(e => e.source === props.node.id).map(e => e.target)
  return missionStore.currentMission.nodes.filter(n => edgeIds.includes(n.id))
})

// ── 进度相关 ──

const completionPct = computed(() => {
  if (!props.node || !props.node.completionTarget) return 0
  return Math.round((props.node.completions.length / props.node.completionTarget) * 100)
})

const completionTargetDisplay = computed(() => {
  if (!props.node) return 0
  if (props.node.completionRule === 'count') return props.node.completionTarget
  return '全员'
})

// ── 状态转换 ──

/** 全部可能的状态转换（编辑模式用） */
const allTransitionsForNode = computed(() => {
  if (!props.node) return []
  const transitions = missionStore._getAllPossibleTransitions(props.node.status)
  return transitions.map(t => ({
    ...t,
    label: t.label || (t.to === 'completed' ? '✅ 标记完成' : t.to === 'in-progress' ? '▶️ 开始执行' : `➡️ ${t.to}`)
  }))
})

/** 权限感知的状态转换（执行模式用） */
const permissionedTransitions = computed(() => {
  if (!props.node || !userStore.username) return []
  let transitions = missionStore.getAllowedTransitions(userStore.username, props.node.id)

  // count/all 模式：不允许手动"标记完成"
  if (props.node.completionRule !== 'single') {
    transitions = transitions.filter(t => t.to !== 'completed')
  }

  return transitions.map(t => ({
    ...t,
    label: t.label || (t.to === 'in-progress' ? '▶️ 开始执行' : `➡️ ${t.to}`)
  }))
})

/** 无可用操作时的具体原因 */
const noOpReason = computed(() => {
  if (!props.node) return ''
  const node = props.node

  if (node.status === 'completed') return '✅ 该节点已完成，无需操作'
  if (node.status === 'cancelled') return '🗑️ 该节点已取消'

  if (node.completionRule !== 'single' && node.status === 'in-progress') {
    return hasClaimedRole(node.assignedRole)
      ? '📊 多人任务：请点击上方「标记我已填写」'
      : '📊 请先认领角色，再点击「标记我已填写」'
  }

  const preds = predecessors.value
  if (preds.length > 0 && !preds.every(n => n.status === 'completed')) {
    const incomplete = preds.filter(n => n.status !== 'completed').map(n => n.title).join('、')
    return `⏳ 前置节点「${incomplete}」未完成，暂不可操作`
  }

  const userRoleNamesStr = userRoleNames.value.length ? userRoleNames.value.join(', ') : '未认领'
  return `🔒 你的角色 (${userRoleNamesStr}) 在当前状态「${statusLabel(node.status)}」下无可用操作`
})

// ── 操作函数 ──

function changeStatus(to) {
  if (!props.node || !userStore.username) return
  if (props.editMode) {
    missionStore.changeNodeStatus(props.node.id, to)
    return
  }
  const allowed = missionStore.checkStatusTransition(userStore.username, props.node.id, to)
  if (!allowed.allowed) {
    alert('❌ ' + allowed.reason)
    return
  }
  missionStore.changeNodeStatus(props.node.id, to)
}

function deleteSelectedNode() {
  if (!props.node) return
  if (!props.editMode) {
    alert('❌ 执行模式下不能删除节点，请切换到编辑模式')
    return
  }
  if (confirm('确定删除此节点？')) {
    missionStore.removeNode(props.node.id)
    emit('close')
  }
}

function claimCurrentRole() {
  if (!props.node || !userStore.username) return
  const roleId = props.node.assignedRole
  if (hasPendingClaimForRole(roleId)) {
    alert('⏳ 已提交过认领申请，请等待管理员审核')
    return
  }
  const policy = claimPolicyForRole(roleId)

  if (policy === 'password') {
    const pwd = prompt('请输入认领口令：')
    if (!pwd) return
    const result = missionStore.claimRoleWithPassword(roleId, userStore.username, pwd)
    if (result.success) {
      alert('✅ 认领成功！')
    } else {
      alert('❌ ' + result.reason)
    }
    return
  }

  if (policy === 'delegated') {
    alert('该角色只能由管理员委派，无法自荐认领')
    return
  }

  const result = missionStore.claimRole(roleId, userStore.username)
  if (result.success) {
    if (result.pending) {
      alert('✅ 已提交认领申请，等待管理员审核')
    } else {
      alert('✅ 认领成功！')
    }
  } else {
    alert('❌ ' + result.reason)
  }
}

function markNodeComplete() {
  if (!props.node || !userStore.username) return
  if (!hasClaimedRole(props.node.assignedRole)) {
    alert('❌ 请先认领角色')
    return
  }
  if (props.editMode) {
    alert('❌ 编辑模式下不能标记完成，请切换到执行模式')
    return
  }
  missionStore.markComplete(props.node.id, userStore.username, userStore.username)
}
</script>
