<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col">
    <!-- 顶部导航栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-3">
        <button class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" @click="$router.push('/missions')" title="返回任务列表">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ mission.title }}</h1>
        <StatusBadge :status="mission.status" :size="'sm'" />
      </div>

      <div class="flex items-center gap-2">
        <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="showAddRole = true">
          👥 角色
        </button>
        <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="showAddEdge = true">
          ↔️ 连线
        </button>
        <button class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" @click="exportMission">
          📥 导出
        </button>
        <button
          class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          @click="showAddNode = true"
        >
          ＋ 添加节点
        </button>
      </div>
    </div>

    <!-- 进度概览 -->
    <div class="flex items-center gap-6 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-sm shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-gray-500 dark:text-gray-400">整体进度:</span>
        <div class="w-40">
          <ProgressBar :pct="progress.pct" :show-label="true" />
        </div>
        <span class="text-gray-500 dark:text-gray-400 tabular-nums">{{ progress.done }}/{{ progress.total }}</span>
      </div>
      <div class="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <span v-for="r in mission.roles" :key="r.id" class="text-xs px-2 py-0.5 rounded-full" :style="{ background: r.color + '20', color: r.color }">
          {{ r.emoji }} {{ r.name }}
        </span>
      </div>
    </div>

    <!-- 主区域: 画布 + 侧栏 -->
    <div class="flex flex-1 min-h-0">
      <!-- 侧栏 -->
      <div class="w-48 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-3 overflow-y-auto shrink-0 hidden md:block">
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">📊 角色统计</h3>
        <div v-for="r in mission.roles" :key="r.id" class="mb-3">
          <div class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ r.emoji }} {{ r.name }}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            已认领: {{ assignmentCount(r.id) }} 人
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            已完成: {{ roleProgress(r.id).completed }}/{{ roleProgress(r.id).assigned }}
          </div>
        </div>

        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">图例</h3>
        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>🟢 可操作</p>
          <p>🔒 锁定</p>
          <p>🔽 子任务</p>
        </div>
      </div>

      <!-- 画布 -->
      <div class="flex-1 relative">
        <GraphCanvas
          ref="canvasRef"
          :nodes="mission.nodes"
          :edges="mission.edges"
          :roles="mission.roles"
          :selected-node-id="selectedNodeId"
          :selected-edge-id="selectedEdgeId"
          @select-node="onSelectNode"
          @dblclick-node="onDblclickNode"
          @select-edge="selectedEdgeId = $event"
        />

        <!-- 缩放控制 -->
        <div class="absolute bottom-4 right-4 z-10">
          <GraphControls
            :zoom="1"
            @zoom-in="canvasRef?.zoomIn()"
            @zoom-out="canvasRef?.zoomOut()"
            @fit-to-screen="canvasRef?.fitToScreen()"
          />
        </div>

        <!-- 空状态提示 -->
        <div v-if="!mission.nodes.length" class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="text-center text-gray-400 dark:text-gray-500">
            <p class="text-5xl mb-2">🗺️</p>
            <p class="text-sm">点击右上角"添加节点"开始构建任务图</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加节点对话框 -->
    <div v-if="showAddNode" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddNode = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加任务节点</h2>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">节点标题</label>
        <input v-model="newNodeTitle" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3" placeholder="例如：填写个人信息表" />

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">负责人角色</label>
        <select v-model="newNodeRole" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3">
          <option value="" disabled>选择角色</option>
          <option v-for="r in mission.roles" :key="r.id" :value="r.id">{{ r.emoji }} {{ r.name }}</option>
        </select>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">完成模式</label>
        <select v-model="newNodeCompletionRule" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2">
          <option value="single">单人完成（一人操作即完成）</option>
          <option value="count">多人完成（累计指定人数）</option>
          <option value="all">全员完成（所有认领人都需完成）</option>
        </select>

        <div v-if="newNodeCompletionRule === 'count'" class="mb-3">
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">目标完成人数</label>
          <input v-model.number="newNodeCompletionTarget" type="number" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showAddNode = false">取消</button>
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newNodeTitle.trim() || !newNodeRole" @click="addNode">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加边对话框 -->
    <div v-if="showAddEdge" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddEdge = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加依赖边</h2>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">源节点（前置）</label>
        <select v-model="newEdgeSource" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3">
          <option value="" disabled>选择节点</option>
          <option v-for="n in mission.nodes" :key="n.id" :value="n.id">{{ n.title }}</option>
        </select>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">目标节点（后置）</label>
        <select v-model="newEdgeTarget" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3">
          <option value="" disabled>选择节点</option>
          <option v-for="n in mission.nodes" :key="n.id" :value="n.id">{{ n.title }}</option>
        </select>

        <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">边标签（可选）</label>
        <input v-model="newEdgeLabel" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4" placeholder="例如：需材料齐备后开始" />

        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showAddEdge = false">取消</button>
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newEdgeSource || !newEdgeTarget || newEdgeSource === newEdgeTarget" @click="addEdge">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加角色对话框 -->
    <div v-if="showAddRole" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddRole = false">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">角色管理</h2>

        <!-- 现有角色列表 -->
        <div class="mb-4 space-y-2">
          <div v-for="r in mission.roles" :key="r.id" class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div class="flex items-center gap-2">
              <span>{{ r.emoji }}</span>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ r.name }}</span>
              <span class="text-xs text-gray-400">{{ r.claimPolicy.type === 'free' ? '自由认领' : r.claimPolicy.type === 'approval' ? '审核认领' : r.claimPolicy.type === 'password' ? '口令认领' : '委派' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400 tabular-nums">{{ assignmentCount(r.id) }}人</span>
              <button class="text-xs text-red-400 hover:text-red-600" @click="removeRole(r.id)">删除</button>
            </div>
          </div>
          <div v-if="!mission.roles.length" class="text-sm text-gray-400 text-center py-4">暂无角色</div>
        </div>

        <hr class="border-gray-200 dark:border-gray-600 mb-4" />

        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">添加角色</h3>
        <div class="grid grid-cols-2 gap-2 mb-3">
          <input v-model="newRole.name" type="text" class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="角色名称（如：班长）" />
          <input v-model="newRole.emoji" type="text" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="👨‍🎓" />
          <input v-model="newRole.color" type="text" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="#F59E0B" />
          <select v-model="newRole.claimType" class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm">
            <option value="free">自由认领</option>
            <option value="approval">审核认领</option>
            <option value="password">口令认领</option>
            <option value="delegated">管理员委派</option>
          </select>
          <input v-if="newRole.claimType === 'password'" v-model="newRole.password" type="text" class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" placeholder="认领口令" />
        </div>
        <div class="flex justify-end">
          <button class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" :disabled="!newRole.name.trim()" @click="addRole">添加角色</button>
        </div>

        <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="showAddRole = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 节点详情面板 -->
    <div v-if="selectedNode" class="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl rounded-t-2xl max-h-[60vh] overflow-y-auto transition-transform" @click.self="selectedNodeId = null">
      <div class="max-w-4xl mx-auto p-4">
        <!-- 面板头部 -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ selectedNode.title }}</h3>
            <StatusBadge :status="selectedNode.status" :size="'sm'" />
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {{ getRoleName(selectedNode.assignedRole) }}
            </span>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="selectedNodeId = null">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- 描述 -->
        <p v-if="selectedNode.description" class="text-sm text-gray-600 dark:text-gray-300 mb-3">{{ selectedNode.description }}</p>
        <p v-else class="text-sm text-gray-400 dark:text-gray-500 mb-3">暂无描述</p>

        <!-- 进度（count/all 模式） -->
        <div v-if="selectedNode.completionRule !== 'single'" class="mb-3">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-gray-600 dark:text-gray-300">完成进度</span>
            <span class="text-gray-500 dark:text-gray-400 tabular-nums">{{ selectedNode.completions.length }}/{{ completionTargetDisplay }}</span>
          </div>
          <ProgressBar :pct="completionPct" :show-label="false" />
          <!-- 已完成列表 -->
          <div v-if="selectedNode.completions.length" class="mt-2 flex flex-wrap gap-1">
            <span v-for="c in selectedNode.completions" :key="c.userId" class="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">✅ {{ c.userName || c.userId }}</span>
          </div>
        </div>

        <!-- 前置/后置 -->
        <div class="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <div>
            <span class="font-medium">前置:</span>
            <span v-if="predecessors.length">{{ predecessors.map(n => n.title).join(', ') }}</span>
            <span v-else class="text-gray-400">无</span>
          </div>
          <div>
            <span class="font-medium">后置:</span>
            <span v-if="successors.length">{{ successors.map(n => n.title).join(', ') }}</span>
            <span v-else class="text-gray-400">无</span>
          </div>
        </div>

        <!-- 角色认领 -->
        <div class="mb-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-300">👤 {{ getRoleName(selectedNode.assignedRole) }}</span>
            <button
              v-if="!hasClaimedRole(selectedNode.assignedRole)"
              class="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 transition-colors"
              @click="claimCurrentRole"
            >
              认领此角色
            </button>
            <span v-else class="text-xs text-green-600 dark:text-green-400">✅ 已认领</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            v-for="t in availableTransitions"
            :key="t.to"
            class="px-3 py-1.5 text-sm rounded-lg transition-colors font-medium"
            :class="transitionButtonClass(t.to)"
            @click="changeStatus(t.to)"
          >
            {{ t.label }}
          </button>
          <button
            v-if="selectedNode.status !== 'completed' && selectedNode.completionRule !== 'single' && hasClaimedRole(selectedNode.assignedRole)"
            class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg transition-colors font-medium"
            @click="markNodeComplete"
          >
            ✅ 标记我已填写
          </button>
          <button class="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" @click="deleteSelectedNode">
            删除节点
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useMissionStore } from '@/stores/mission'
import { useUserStore } from '@/stores/user'
import GraphCanvas from '@/components/mission/GraphCanvas.vue'
import GraphControls from '@/components/mission/GraphControls.vue'
import ProgressBar from '@/components/mission/ProgressBar.vue'
import StatusBadge from '@/components/mission/StatusBadge.vue'

const route = useRoute()
const missionStore = useMissionStore()
const userStore = useUserStore()

const canvasRef = ref(null)
const selectedNodeId = ref(null)
const selectedEdgeId = ref(null)

// 添加节点
const showAddNode = ref(false)
const newNodeTitle = ref('')
const newNodeRole = ref('')
const newNodeCompletionRule = ref('single')
const newNodeCompletionTarget = ref(30)

// 添加边
const showAddEdge = ref(false)
const newEdgeSource = ref('')
const newEdgeTarget = ref('')
const newEdgeLabel = ref('')

// 角色管理
const showAddRole = ref(false)
const newRole = ref({ name: '', emoji: '👤', color: '#6B7280', claimType: 'free', password: '' })

const mission = computed(() => missionStore.currentMission || { nodes: [], edges: [], roles: [] })
const progress = computed(() => missionStore.progress)

const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  return missionStore.currentMission?.nodes.find(n => n.id === selectedNodeId.value) || null
})

onMounted(() => {
  const id = route.params.id
  if (id) missionStore.loadMission(id)
})

watch(() => route.params.id, (id) => {
  if (id) missionStore.loadMission(id)
})

function addNode() {
  if (!newNodeTitle.value.trim() || !newNodeRole.value) return
  missionStore.addNode(newNodeTitle.value.trim(), newNodeRole.value, {
    completionRule: newNodeCompletionRule.value,
    completionTarget: newNodeCompletionRule.value === 'count' ? newNodeCompletionTarget.value : 1
  })
  newNodeTitle.value = ''
  showAddNode.value = false
}

function addEdge() {
  if (!newEdgeSource.value || !newEdgeTarget.value) return
  missionStore.addEdge(newEdgeSource.value, newEdgeTarget.value, newEdgeLabel.value)
  newEdgeSource.value = ''
  newEdgeTarget.value = ''
  newEdgeLabel.value = ''
  showAddEdge.value = false
}

function onSelectNode(nodeId) {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId
}

function onDblclickNode(nodeId) {
  selectedNodeId.value = nodeId
}

function exportMission() {
  missionStore.downloadMission(route.params.id)
}

function deleteSelectedNode() {
  if (!selectedNodeId.value) return
  if (confirm('确定删除此节点？')) {
    missionStore.removeNode(selectedNodeId.value)
    selectedNodeId.value = null
  }
}

function getRoleName(roleId) {
  return missionStore.currentMission?.roles.find(r => r.id === roleId)?.name || roleId
}

function getRoleEmoji(roleId) {
  return missionStore.currentMission?.roles.find(r => r.id === roleId)?.emoji || '👤'
}

function getRoleColor(roleId) {
  return missionStore.currentMission?.roles.find(r => r.id === roleId)?.color || '#6B7280'
}

function assignmentCount(roleId) {
  return missionStore.currentMission?.assignments.filter(a => a.roleId === roleId && a.status === 'approved').length || 0
}

function roleProgress(roleId) {
  return missionStore.roleProgress(roleId)
}

const predecessors = computed(() => {
  if (!selectedNode.value || !missionStore.currentMission) return []
  const edgeIds = missionStore.currentMission.edges.filter(e => e.target === selectedNode.value.id).map(e => e.source)
  return missionStore.currentMission.nodes.filter(n => edgeIds.includes(n.id))
})

const successors = computed(() => {
  if (!selectedNode.value || !missionStore.currentMission) return []
  const edgeIds = missionStore.currentMission.edges.filter(e => e.source === selectedNode.value.id).map(e => e.target)
  return missionStore.currentMission.nodes.filter(n => edgeIds.includes(n.id))
})

const completionPct = computed(() => {
  if (!selectedNode.value || !selectedNode.value.completionTarget) return 0
  return Math.round((selectedNode.value.completions.length / selectedNode.value.completionTarget) * 100)
})

const completionTargetDisplay = computed(() => {
  if (!selectedNode.value) return 0
  if (selectedNode.value.completionRule === 'count') return selectedNode.value.completionTarget
  return '全员'
})

// 状态转换
const availableTransitions = computed(() => {
  if (!selectedNode.value) return []
  const status = selectedNode.value.status
  const transitions = {
    'todo': [{ to: 'in-progress', label: '▶️ 开始执行' }],
    'in-progress': [
      { to: 'completed', label: '✅ 标记完成' },
      { to: 'blocked', label: '⛔ 标记阻塞' }
    ],
    'completed': [
      { to: 'in-progress', label: '🔄 重新打开' }
    ],
    'blocked': [
      { to: 'in-progress', label: '🔄 解除阻塞' },
      { to: 'cancelled', label: '🗑️ 取消' }
    ],
    'cancelled': [
      { to: 'todo', label: '🔄 恢复' }
    ]
  }
  return transitions[status] || []
})

function transitionButtonClass(to) {
  if (to === 'completed') return 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
  if (to === 'blocked' || to === 'cancelled') return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
  return 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
}

function changeStatus(to) {
  if (!selectedNode.value) return
  missionStore.changeNodeStatus(selectedNode.value.id, to)
}

// ── 角色管理 ──
function addRole() {
  if (!newRole.value.name.trim()) return
  missionStore.addRole(
    newRole.value.name.trim(),
    newRole.value.color,
    newRole.value.emoji,
    { type: newRole.value.claimType, password: newRole.value.claimType === 'password' ? newRole.value.password : null }
  )
  newRole.value = { name: '', emoji: '👤', color: '#6B7280', claimType: 'free', password: '' }
}

function removeRole(roleId) {
  if (confirm('确定删除此角色？')) {
    missionStore.removeRole(roleId)
  }
}

function hasClaimedRole(roleId) {
  const username = userStore.username
  if (!username) return false
  return !!missionStore.currentMission?.assignments.find(
    a => a.roleId === roleId && a.userId === username && a.status === 'approved'
  )
}

function claimCurrentRole() {
  if (!selectedNode.value || !userStore.username) return
  const result = missionStore.claimRole(selectedNode.value.assignedRole, userStore.username)
  if (result.success) {
    if (result.pending) {
      alert('已提交认领申请，等待审核')
    } else {
      alert('认领成功！')
    }
  } else {
    alert(result.reason)
  }
}

function markNodeComplete() {
  if (!selectedNode.value || !userStore.username) return
  const userName = userStore.username
  missionStore.markComplete(selectedNode.value.id, userStore.username, userName)
  alert('已标记完成！')
}
</script>
