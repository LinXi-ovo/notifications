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
const STORAGE_KEY_RECYCLE = 'missions:recycle'
const STORAGE_KEY_PREFIX = 'mission:'
const RECYCLE_DAYS = 30 // 回收站保留天数

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
    /** 回收站 [{ id, title, deletedAt }] */
    recycleBin: loadJSON(STORAGE_KEY_RECYCLE, []),
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

    /** 创建新 Mission（含默认角色） */
    createMission(title, createdBy) {
      const mission = createMission(title, createdBy)
      // 添加默认角色
      mission.roles.push(
        createRole('普通成员', '#3B82F6', '🟢', { type: 'free' }),
        createRole('管理员', '#EF4444', '🔴', { type: 'free' })
      )
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

    /** 软删除：Mission 移入回收站 */
    deleteMission(id) {
      const entry = this.index.find(i => i.id === id)
      if (!entry) return
      // 从索引移除
      this.index = this.index.filter(i => i.id !== id)
      saveJSON(STORAGE_KEY_INDEX, this.index)
      // 加入回收站
      this.recycleBin.push({
        id: entry.id,
        title: entry.title,
        deletedAt: new Date().toISOString()
      })
      saveJSON(STORAGE_KEY_RECYCLE, this.recycleBin)
      // 数据保留在 localStorage（mission:{id} 不删除）
      if (this.currentMission?.id === id) {
        this.currentMission = null
      }
    },

    /** 永久删除：从回收站彻底移除 */
    permanentlyDeleteMission(id) {
      removeKey(STORAGE_KEY_PREFIX + id)
      this.recycleBin = this.recycleBin.filter(i => i.id !== id)
      saveJSON(STORAGE_KEY_RECYCLE, this.recycleBin)
    },

    /** 从回收站恢复到主列表 */
    restoreMission(id) {
      const item = this.recycleBin.find(i => i.id === id)
      if (!item) return
      // 从回收站移除
      this.recycleBin = this.recycleBin.filter(i => i.id !== id)
      saveJSON(STORAGE_KEY_RECYCLE, this.recycleBin)
      // 恢复到索引
      const data = loadJSON(STORAGE_KEY_PREFIX + id)
      if (data) {
        this.index.push({
          id: data.id,
          title: data.title,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        })
        saveJSON(STORAGE_KEY_INDEX, this.index)
      }
    },

    /** 一键清空回收站（含确认） */
    emptyRecycleBin() {
      for (const item of this.recycleBin) {
        removeKey(STORAGE_KEY_PREFIX + item.id)
      }
      this.recycleBin = []
      saveJSON(STORAGE_KEY_RECYCLE, this.recycleBin)
    },

    /** 获取所有 Mission 概要（含回收站自动清理） */
    fetchIndex() {
      this.index = loadJSON(STORAGE_KEY_INDEX, [])
      this.recycleBin = loadJSON(STORAGE_KEY_RECYCLE, [])
      this._autoCleanRecycleBin()
      return this.index
    },

    /** 自动清理超 30 天的回收站条目 */
    _autoCleanRecycleBin() {
      const now = Date.now()
      const cutoff = now - RECYCLE_DAYS * 24 * 60 * 60 * 1000
      const before = this.recycleBin.length
      this.recycleBin = this.recycleBin.filter(item => {
        const deletedAt = new Date(item.deletedAt).getTime()
        if (deletedAt < cutoff) {
          // 永久删除数据
          removeKey(STORAGE_KEY_PREFIX + item.id)
          return false
        }
        return true
      })
      if (this.recycleBin.length !== before) {
        saveJSON(STORAGE_KEY_RECYCLE, this.recycleBin)
      }
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

    /**
     * 获取用户在当前 Mission 中已认领的角色 ID 列表
     * @param {string} userId
     * @returns {string[]}
     */
    _getUserRoleIds(userId) {
      if (!this.currentMission) return []
      return this.currentMission.assignments
        .filter(a => a.userId === userId && a.status === 'approved')
        .map(a => a.roleId)
    },

    /**
     * 获取角色的权限配置（合并 mission.permissions + DEFAULT_PERMISSIONS）
     * @param {string} roleId
     * @returns {import('@/types/mission').Permission|null}
     */
    _getRolePermissions(roleId) {
      if (!this.currentMission) return null
      // 优先从 mission.permissions 获取
      const customPerm = this.currentMission.permissions.find(p => p.roleId === roleId)
      if (customPerm) return customPerm

      // 从角色名称映射到 DEFAULT_PERMISSIONS
      const role = this.currentMission.roles.find(r => r.id === roleId)
      if (!role) return null

      // 按角色名称尝试匹配
      const nameMap = {
        '普通成员': 'executor',
        '执行人': 'executor',
        '成员': 'executor',
        '审核员': 'reviewer',
        '审批人': 'approver',
        '管理员': 'admin',
        '负责人': 'admin',
        '观察员': 'observer',
        '辅导员': 'approver',
        '主管': 'reviewer',
        '财务': 'reviewer',
        '总经理': 'approver',
        '班长': 'executor',
        '组长': 'executor',
        '发起人': 'executor'
      }
      const key = nameMap[role.name]
      if (key && DEFAULT_PERMISSIONS[key]) return DEFAULT_PERMISSIONS[key]

      // 默认返回 executor 权限
      return DEFAULT_PERMISSIONS.executor
    },

    /**
     * 三步权限判定法 — 检查用户能否操作节点
     *
     * Step 1: 管理员免检
     * Step 2: 节点级白名单（allowedOperators / allowedUsers）
     * Step 3: 角色级权限
     *
     * @param {string} userId
     * @param {string} nodeId
     * @returns {{ canOperate: boolean, reason: string, roleIds: string[] }}
     */
    checkNodeOperation(userId, nodeId) {
      if (!this.currentMission) return { canOperate: false, reason: '没有加载任务', roleIds: [] }

      // Step 1: 管理员免检
      const isAdmin = userId === 'admin'
      const userRoleIds = this._getUserRoleIds(userId)

      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return { canOperate: false, reason: '节点不存在', roleIds: userRoleIds }

      // Step 2a: allowedOperators 白名单（节点级角色白名单）
      if (node.allowedOperators.length > 0) {
        const hasAllowedRole = node.allowedOperators.some(rId => userRoleIds.includes(rId))
        if (!hasAllowedRole && !isAdmin) {
          return { canOperate: false, reason: '该节点仅限特定角色操作', roleIds: userRoleIds }
        }
      }

      // Step 2b: allowedUsers 白名单（节点级用户白名单）
      if (node.allowedUsers.length > 0 && !node.allowedUsers.includes(userId) && !isAdmin) {
        return { canOperate: false, reason: '该节点仅限特定用户操作', roleIds: userRoleIds }
      }

      // Step 2c: 检查是否至少有一个角色认领了 assignedRole
      const hasAssignedRole = userRoleIds.includes(node.assignedRole) || isAdmin
      if (!hasAssignedRole) {
        // 但如果在 allowedOperators 中有角色，则不要求 assignedRole 匹配
        const hasAnyRoleForNode = node.allowedOperators.length === 0 || node.allowedOperators.some(rId => userRoleIds.includes(rId))
        if (!hasAnyRoleForNode && !isAdmin) {
          return { canOperate: false, reason: '未认领该节点所需的角色', roleIds: userRoleIds }
        }
      }

      if (isAdmin) return { canOperate: true, reason: '管理员权限', roleIds: userRoleIds }

      return { canOperate: true, reason: '', roleIds: userRoleIds }
    },

    /**
     * 获取用户对指定节点允许的状态转换列表
     * @param {string} userId
     * @param {string} nodeId
     * @returns {Array<{ from: string, to: string, label: string }>}
     */
    getAllowedTransitions(userId, nodeId) {
      if (!this.currentMission) return []

      const isAdmin = userId === 'admin'
      if (isAdmin) {
        // 管理员：返回所有可能的转换
        const node = this.currentMission.nodes.find(n => n.id === nodeId)
        if (!node) return []
        return this._getAllPossibleTransitions(node.status)
      }

      const userRoleIds = this._getUserRoleIds(userId)
      if (!userRoleIds.length) return []

      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return []

      // 收集用户所有角色的允许转换
      const allowedTransitions = []
      const seen = new Set()

      for (const roleId of userRoleIds) {
        const perm = this._getRolePermissions(roleId)
        if (!perm || !perm.transitions) continue

        for (const t of perm.transitions) {
          if (t.from === node.status) {
            const key = `${t.from}→${t.to}`
            if (!seen.has(key)) {
              seen.add(key)
              allowedTransitions.push(t)
            }
          }
        }
      }

      return allowedTransitions
    },

    /**
     * 检查用户是否允许执行特定的状态转换
     * @param {string} userId
     * @param {string} nodeId
     * @param {string} toStatus
     * @returns {{ allowed: boolean, reason: string }}
     */
    checkStatusTransition(userId, nodeId, toStatus) {
      if (!this.currentMission) return { allowed: false, reason: '没有加载任务' }

      const isAdmin = userId === 'admin'
      if (isAdmin) return { allowed: true, reason: '' }

      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return { allowed: false, reason: '节点不存在' }

      const transitions = this.getAllowedTransitions(userId, nodeId)
      const match = transitions.find(t => t.to === toStatus)

      if (!match) {
        return { allowed: false, reason: '你的角色不允许此状态转换' }
      }

      return { allowed: true, reason: '' }
    },

    /**
     * 获取用户对节点的所有允许操作
     * @param {string} userId
     * @param {string} nodeId
     * @returns {{ canOperate: boolean, canComment: boolean, canEditContent: boolean, transitions: Array, canComplete: boolean, reason: string }}
     */
    getAllowedOperations(userId, nodeId) {
      if (!this.currentMission) {
        return { canOperate: false, canComment: false, canEditContent: false, transitions: [], canComplete: false, reason: '没有加载任务' }
      }

      const isAdmin = userId === 'admin'
      const nodeOp = this.checkNodeOperation(userId, nodeId)

      if (!nodeOp.canOperate && !isAdmin) {
        return {
          canOperate: false,
          canComment: false,
          canEditContent: false,
          transitions: [],
          canComplete: false,
          reason: nodeOp.reason
        }
      }

      // 收集所有角色的权限
      const userRoleIds = isAdmin
        ? (this.currentMission.roles?.map(r => r.id) || [])
        : nodeOp.roleIds

      let canComment = false
      let canEditContent = false

      for (const roleId of userRoleIds) {
        const perm = this._getRolePermissions(roleId)
        if (!perm) continue
        if (perm.canComment) canComment = true
        if (perm.canEditContent) canEditContent = true
      }

      // 管理员全部允许
      if (isAdmin) {
        canComment = true
        canEditContent = true
      }

      const transitions = this.getAllowedTransitions(userId, nodeId)

      // 判断能否标记完成（in-progress → completed 在 transitions 中）
      const canComplete = transitions.some(t => t.to === 'completed')

      return {
        canOperate: true,
        canComment,
        canEditContent,
        transitions,
        canComplete,
        reason: ''
      }
    },

    /**
     * 获取所有可能的转换（基于当前状态，不考虑角色限制）
     * @param {string} status
     * @returns {Array<{ from: string, to: string, label: string }>}
     */
    _getAllPossibleTransitions(status) {
      const allTransitions = {
        'todo': [
          { from: 'todo', to: 'in-progress', label: '▶️ 开始执行' }
        ],
        'in-progress': [
          { from: 'in-progress', to: 'completed', label: '✅ 标记完成' },
          { from: 'in-progress', to: 'blocked', label: '⛔ 标记阻塞' }
        ],
        'completed': [
          { from: 'completed', to: 'in-progress', label: '🔄 重新打开' }
        ],
        'blocked': [
          { from: 'blocked', to: 'in-progress', label: '🔄 解除阻塞' },
          { from: 'blocked', to: 'cancelled', label: '🗑️ 取消' }
        ],
        'cancelled': [
          { from: 'cancelled', to: 'todo', label: '🔄 恢复' }
        ]
      }
      return allTransitions[status] || []
    },

    /**
     * 检查用户对字段的权限
     * @param {string} userId
     * @param {string} fieldId
     * @returns {'hidden' | 'readonly' | 'editable'}
     */
    checkFieldPermission(userId, fieldId) {
      if (!this.currentMission) return 'hidden'

      const isAdmin = userId === 'admin'
      if (isAdmin) return 'editable'

      const field = this.currentMission.customFields.find(f => f.id === fieldId)
      if (!field) return 'hidden'

      const userRoleIds = this._getUserRoleIds(userId)

      // 可见性检查: visibleToRoles 为空表示所有人可见
      if (field.visibleToRoles.length > 0 && !field.visibleToRoles.includes('*')) {
        const canSee = field.visibleToRoles.some(rId => userRoleIds.includes(rId))
        if (!canSee) return 'hidden'
      }

      // 可编辑性检查
      if (field.editableByRoles.length > 0 && !field.editableByRoles.includes('*')) {
        const canEdit = field.editableByRoles.some(rId => userRoleIds.includes(rId))
        if (canEdit) return 'editable'
        return 'readonly'
      }

      // 默认：如果不在 ediableByRoles 中但可见，则为只读
      return 'readonly'
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
