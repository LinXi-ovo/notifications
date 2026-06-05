import { defineStore } from 'pinia'
import {
  createMission,
  createTaskNode,
  createEdge,
  createRole,
  DEFAULT_PERMISSIONS,
  shortId
} from '@/types/mission'

const STORAGE_KEY_INDEX = 'missions:index'
const STORAGE_KEY_PREFIX = 'mission:'

/** localStorage 工具 */
function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}
function removeKey(key) {
  localStorage.removeItem(key)
}

export const useMissionStore = defineStore('mission', {
  state: () => ({
    /** Mission 概要索引 [{ id, title, status, updatedAt }] */
    index: loadJSON(STORAGE_KEY_INDEX, []),
    /** 当前加载的完整 Mission */
    currentMission: null,
    /** 加载状态 */
    loading: false,
    /** 错误信息 */
    error: null
  }),

  getters: {
    /** 当前 Mission 的节点列表（按 position 排序） */
    nodes: (state) => {
      if (!state.currentMission) return []
      return [...state.currentMission.nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
    },
    /** 当前 Mission 的边列表 */
    edges: (state) => state.currentMission?.edges || [],
    /** 当前 Mission 的角色列表 */
    roles: (state) => state.currentMission?.roles || [],
    /** 当前 Mission 的已认领列表 */
    assignments: (state) => state.currentMission?.assignments || [],
    /** 获取指定节点 */
    getNodeById: (state) => (id) => {
      if (!state.currentMission) return null
      return state.currentMission.nodes.find(n => n.id === id) || null
    },
    /** 获取指定角色 */
    getRoleById: (state) => (roleId) => {
      if (!state.currentMission) return null
      return state.currentMission.roles.find(r => r.id === roleId) || null
    },
    /** Mission 进度统计 */
    progress: (state) => {
      if (!state.currentMission || !state.currentMission.nodes.length) {
        return { done: 0, total: 0, pct: 0 }
      }
      const total = state.currentMission.nodes.length
      const done = state.currentMission.nodes.filter(n => n.status === 'completed').length
      return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
    },
    /** 按角色的统计 */
    roleProgress: (state) => (roleId) => {
      if (!state.currentMission) return { assigned: 0, completed: 0 }
      const nodes = state.currentMission.nodes.filter(n => n.assignedRole === roleId)
      return {
        assigned: nodes.length,
        completed: nodes.filter(n => n.status === 'completed').length
      }
    }
  },

  actions: {
    // ──────────────── 持久化 ────────────────

    /** 保存当前 Mission 到 localStorage */
    _saveMission() {
      if (!this.currentMission) return
      saveJSON(STORAGE_KEY_PREFIX + this.currentMission.id, this.currentMission)
      // 更新索引
      const entry = this.index.find(i => i.id === this.currentMission.id)
      if (entry) {
        entry.title = this.currentMission.title
        entry.status = this.currentMission.status
        entry.updatedAt = this.currentMission.updatedAt
      }
      saveJSON(STORAGE_KEY_INDEX, this.index)
    },

    /** 更新索引 */
    _updateIndex() {
      saveJSON(STORAGE_KEY_INDEX, this.index)
    },

    // ──────────────── Mission CRUD ────────────────

    /** 创建新 Mission */
    createMission(title, createdBy) {
      const mission = createMission(title, createdBy)
      // 写入索引
      this.index.push({
        id: mission.id,
        title: mission.title,
        status: mission.status,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt
      })
      saveJSON(STORAGE_KEY_INDEX, this.index)
      // 保存完整数据
      this.currentMission = mission
      this._saveMission()
      return mission
    },

    /** 加载 Mission */
    loadMission(id) {
      this.loading = true
      this.error = null
      try {
        const data = loadJSON(STORAGE_KEY_PREFIX + id)
        if (!data) {
          this.error = '任务不存在'
          this.currentMission = null
          return null
        }
        this.currentMission = data
        return data
      } catch (e) {
        this.error = e.message
        this.currentMission = null
        return null
      } finally {
        this.loading = false
      }
    },

    /** 更新 Mission 属性 */
    updateMission(patches) {
      if (!this.currentMission) return
      Object.assign(this.currentMission, patches)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
    },

    /** 删除 Mission */
    deleteMission(id) {
      removeKey(STORAGE_KEY_PREFIX + id)
      this.index = this.index.filter(i => i.id !== id)
      saveJSON(STORAGE_KEY_INDEX, this.index)
      if (this.currentMission?.id === id) {
        this.currentMission = null
      }
    },

    /** 获取所有 Mission 概要 */
    fetchIndex() {
      this.index = loadJSON(STORAGE_KEY_INDEX, [])
      return this.index
    },

    // ──────────────── Node CRUD ────────────────

    /** 添加节点 */
    addNode(title, assignedRole, opts = {}) {
      if (!this.currentMission) return null
      const node = createTaskNode(title, assignedRole, opts)
      this.currentMission.nodes.push(node)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return node
    },

    /** 删除节点及其相关边 */
    removeNode(nodeId) {
      if (!this.currentMission) return
      this.currentMission.nodes = this.currentMission.nodes.filter(n => n.id !== nodeId)
      this.currentMission.edges = this.currentMission.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
    },

    /** 更新节点 */
    updateNode(nodeId, patch) {
      if (!this.currentMission) return null
      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return null
      Object.assign(node, patch)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return node
    },

    /** 标记节点完成（支持 completionRule） */
    markComplete(nodeId, userId, userName, customValues = {}) {
      if (!this.currentMission) return
      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return

      const now = new Date().toISOString()
      // 单人模式 → 直接完成
      if (node.completionRule === 'single') {
        node.status = 'completed'
        node.completions = [{
          userId,
          userName,
          completedAt: now,
          customValues
        }]
        this.currentMission.updatedAt = new Date().toISOString()
        this._saveMission()
        return
      }

      // count/all 模式 → 追加完成记录
      // 避免重复
      if (!node.completions.find(c => c.userId === userId)) {
        node.completions.push({
          userId,
          userName,
          completedAt: now,
          customValues
        })
      }

      // 检查是否达到目标
      const target = node.completionRule === 'count'
        ? node.completionTarget
        : this._getAssignedCount(node.assignedRole) // 'all' → 所有认领人

      if (node.completions.length >= target) {
        node.status = 'completed'
      }

      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
    },

    /** 变更节点状态 */
    changeNodeStatus(nodeId, newStatus) {
      if (!this.currentMission) return null
      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return null
      node.status = newStatus
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return node
    },

    /** 获取指定角色已认领人数 */
    _getAssignedCount(roleId) {
      if (!this.currentMission) return 0
      return this.currentMission.assignments.filter(a => a.roleId === roleId && a.status === 'approved').length
    },

    // ──────────────── Edge CRUD ────────────────

    /** 添加边（含循环检测） */
    addEdge(source, target, label = '') {
      if (!this.currentMission) return null
      // 循环检测
      if (this._wouldCreateCycle(source, target)) {
        this.error = '不允许添加循环依赖'
        return null
      }
      const edge = createEdge(source, target, label)
      this.currentMission.edges.push(edge)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return edge
    },

    /** 删除边 */
    removeEdge(edgeId) {
      if (!this.currentMission) return
      this.currentMission.edges = this.currentMission.edges.filter(e => e.id !== edgeId)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
    },

    /** 循环检测（BFS） */
    _wouldCreateCycle(source, target) {
      if (!this.currentMission) return false
      if (source === target) return true
      // 从 target 出发，看是否能到达 source
      const adj = {}
      for (const e of this.currentMission.edges) {
        if (!adj[e.source]) adj[e.source] = []
        adj[e.source].push(e.target)
      }
      // 加上待添加的边
      if (!adj[source]) adj[source] = []
      adj[source].push(target)

      const visited = new Set()
      const queue = [target]
      while (queue.length) {
        const cur = queue.shift()
        if (cur === source) return true
        if (visited.has(cur)) continue
        visited.add(cur)
        for (const next of (adj[cur] || [])) {
          queue.push(next)
        }
      }
      return false
    },

    // ──────────────── Role CRUD ────────────────

    /** 添加角色 */
    addRole(name, color, emoji, claimPolicy = { type: 'free' }) {
      if (!this.currentMission) return null
      const role = createRole(name, color, emoji, claimPolicy)
      this.currentMission.roles.push(role)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return role
    },

    /** 删除角色 */
    removeRole(roleId) {
      if (!this.currentMission) return
      this.currentMission.roles = this.currentMission.roles.filter(r => r.id !== roleId)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
    },

    /** 更新角色 */
    updateRole(roleId, patch) {
      if (!this.currentMission) return null
      const role = this.currentMission.roles.find(r => r.id === roleId)
      if (!role) return null
      Object.assign(role, patch)
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return role
    },

    // ──────────────── 角色认领 ────────────────

    /** 认领角色 */
    claimRole(roleId, userId) {
      if (!this.currentMission) return { success: false, reason: '没有加载任务' }
      const role = this.currentMission.roles.find(r => r.id === roleId)
      if (!role) return { success: false, reason: '角色不存在' }

      // 检查是否已认领
      if (this.currentMission.assignments.find(a => a.roleId === roleId && a.userId === userId)) {
        return { success: false, reason: '已经认领过该角色' }
      }

      // 检查上限
      const approvedCount = this.currentMission.assignments.filter(a => a.roleId === roleId && a.status === 'approved').length
      if (approvedCount >= role.maxAssignees) {
        return { success: false, reason: '该角色认领人数已满' }
      }

      const now = new Date().toISOString()

      if (role.claimPolicy.type === 'free') {
        this.currentMission.assignments.push({
          roleId,
          userId,
          assignedAt: now,
          status: 'approved'
        })
        this.currentMission.updatedAt = now
        this._saveMission()
        return { success: true }
      }

      if (role.claimPolicy.type === 'password') {
        // 需要调用 claimRoleWithPassword
        return { success: false, reason: '需要口令认领' }
      }

      if (role.claimPolicy.type === 'approval') {
        this.currentMission.assignments.push({
          roleId,
          userId,
          assignedAt: now,
          status: 'pending'
        })
        this.currentMission.updatedAt = now
        this._saveMission()
        return { success: true, pending: true }
      }

      if (role.claimPolicy.type === 'delegated') {
        return { success: false, reason: '该角色只能由管理员委派' }
      }

      return { success: false, reason: '未知的认领策略' }
    },

    /** 口令认领 */
    claimRoleWithPassword(roleId, userId, password) {
      if (!this.currentMission) return { success: false, reason: '没有加载任务' }
      const role = this.currentMission.roles.find(r => r.id === roleId)
      if (!role) return { success: false, reason: '角色不存在' }
      if (role.claimPolicy.type !== 'password') return { success: false, reason: '该角色不支持下口令认领' }

      // 简单密码比对（生产环境应使用哈希）
      if (role.claimPolicy.password && password !== role.claimPolicy.password) {
        return { success: false, reason: '口令错误' }
      }

      const now = new Date().toISOString()
      this.currentMission.assignments.push({
        roleId,
        userId,
        assignedAt: now,
        status: 'approved'
      })
      this.currentMission.updatedAt = now
      this._saveMission()
      return { success: true }
    },

    /** 审批认领 */
    approveClaim(assignmentIndex, approvedBy) {
      if (!this.currentMission) return false
      const assignment = this.currentMission.assignments[assignmentIndex]
      if (!assignment || assignment.status !== 'pending') return false
      assignment.status = 'approved'
      assignment.approvedBy = approvedBy
      assignment.approvedAt = new Date().toISOString()
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return true
    },

    /** 拒绝认领 */
    rejectClaim(assignmentIndex) {
      if (!this.currentMission) return false
      const assignment = this.currentMission.assignments[assignmentIndex]
      if (!assignment || assignment.status !== 'pending') return false
      assignment.status = 'rejected'
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      return true
    },

    /** 委派角色（delegated） */
    delegateRole(roleId, userId, delegatedBy) {
      if (!this.currentMission) return { success: false, reason: '没有加载任务' }
      const now = new Date().toISOString()
      this.currentMission.assignments.push({
        roleId,
        userId,
        assignedAt: now,
        status: 'approved',
        approvedBy: delegatedBy,
        approvedAt: now
      })
      this.currentMission.updatedAt = now
      this._saveMission()
      return { success: true }
    },

    /** 获取待审批列表 */
    getPendingClaims() {
      if (!this.currentMission) return []
      return this.currentMission.assignments.filter(a => a.status === 'pending')
    },

    /** 获取用户的已认领角色 */
    getUserAssignments(userId) {
      if (!this.currentMission) return []
      return this.currentMission.assignments.filter(a => a.userId === userId && a.status === 'approved')
    },

    // ──────────────── 权限判定 ────────────────

    /** 检查用户能否操作节点 */
    checkNodeOperation(userId, nodeId) {
      if (!this.currentMission) return { canOperate: false, reason: '没有加载任务' }

      const isAdmin = userId === 'admin'
      if (isAdmin) return { canOperate: true, reason: '' }

      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return { canOperate: false, reason: '节点不存在' }

      // 检查用户是否已认领了该节点的 assignedRole
      const userRole = this.currentMission.assignments.find(
        a => a.userId === userId && a.roleId === node.assignedRole && a.status === 'approved'
      )
      if (!userRole) return { canOperate: false, reason: '未认领该角色' }

      // allowedOperators 白名单
      if (node.allowedOperators.length > 0 && !node.allowedOperators.includes(node.assignedRole)) {
        return { canOperate: false, reason: '该节点仅限特定角色操作' }
      }

      // allowedUsers 白名单
      if (node.allowedUsers.length > 0 && !node.allowedUsers.includes(userId)) {
        return { canOperate: false, reason: '该节点仅限特定用户操作' }
      }

      return { canOperate: true, reason: '' }
    },

    // ──────────────── 导入导出 ────────────────

    /** 导出 Mission 为 JSON 对象 */
    exportMission(id) {
      const data = id
        ? loadJSON(STORAGE_KEY_PREFIX + id)
        : this.currentMission
      if (!data) return null

      data.exportMeta = {
        exportedAt: new Date().toISOString(),
        includesSubMissions: true,
        includesComments: true
      }
      return JSON.stringify(data, null, 2)
    },

    /** 下载 JSON 文件 */
    downloadMission(id) {
      const json = this.exportMission(id)
      if (!json) return
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const mission = id ? loadJSON(STORAGE_KEY_PREFIX + id) : this.currentMission
      a.href = url
      a.download = `mission-${mission?.id || id}.json`
      a.click()
      URL.revokeObjectURL(url)
    },

    /** 导入 Mission（从 JSON 对象） */
    importMission(jsonStr, conflictStrategy = 'skip') {
      this.error = null
      try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
        if (!data.id || !data.title) {
          this.error = '无效的任务数据格式'
          return null
        }

        // 冲突检测
        const existing = this.index.find(i => i.id === data.id)
        if (existing) {
          if (conflictStrategy === 'skip') {
            this.error = `任务 "${data.title}" 已存在，已跳过`
            return null
          }
          if (conflictStrategy === 'overwrite') {
            // 覆盖
            this.currentMission = data
            this._saveMission()
            return data
          }
          if (conflictStrategy === 'rename') {
            data.id = data.id + '_v2'
            data.title = data.title + ' (导入)'
          }
        }

        // 写入
        this.currentMission = data
        this._saveMission()
        // 确保索引中有
        if (!this.index.find(i => i.id === data.id)) {
          this.index.push({
            id: data.id,
            title: data.title,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          })
          this._updateIndex()
        }
        return data
      } catch (e) {
        this.error = '解析失败: ' + e.message
        return null
      }
    },

    /** 清除错误 */
    clearError() {
      this.error = null
    }
  }
})
