import { defineStore } from 'pinia'
import {
  createMission as createMissionObj,
  createTaskNode,
  createEdge,
  createRole,
  DEFAULT_PERMISSIONS,
  shortId
} from '@/types/mission'
import {
  fetchMissionIndex,
  fetchMission,
  createMission as createMissionBmob,
  saveMission as saveMissionBmob,
  softDeleteMission,
  hardDeleteMission,
  fetchAssignments,
  syncAssignments,
  checkBmobOnline
} from '@/api/mission'

/** 简单防抖 */
function debounce(fn, delay) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const STORAGE_KEY_INDEX = 'missions:index'
const STORAGE_KEY_RECYCLE = 'missions:recycle'
const STORAGE_KEY_PREFIX = 'mission:'
const STORAGE_KEY_ADMIN_BYPASS = 'missions:adminBypass'
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
    error: null,
    /** 管理员权限绕过开关（调试用，持久化） */
    adminBypass: loadJSON(STORAGE_KEY_ADMIN_BYPASS, false),
    /** Bmob 在线状态 */
    online: navigator.onLine !== false,
    /** Bmob 同步中 */
    bmobSyncing: false,
    /** 标记已迁移（localStorage → Bmob） */
    migrated: loadJSON('missions:migrated', false),
    /** Bmob 加载错误（用于 UI 离线提示） */
    bmobLoadError: null
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

    /** 保存当前 Mission 到 localStorage + 触发 Bmob 同步 */
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

      // 触发 Bmob 防抖同步
      this._triggerBmobSync()
    },

    /** 防抖触发 Bmob 同步 */
    _triggerBmobSync: debounce(function () {
      this._saveToBmob()
    }, 800),

    /** 更新索引 */
    _updateIndex() {
      saveJSON(STORAGE_KEY_INDEX, this.index)
    },

    // ──────────────── Mission CRUD ────────────────

    /** 创建新 Mission（含默认角色 + Bmob 同步） */
    async createMission(title, createdBy) {
      const mission = createMissionObj(title, createdBy)
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

      // 保存完整数据到 localStorage
      this.currentMission = mission
      this._saveMission()

      // 同步到 Bmob（如果已迁移）
      if (this.migrated) {
        try {
          const result = await createMissionBmob(mission)
          if (result && result._bmobObjectId) {
            this.currentMission._bmobObjectId = result._bmobObjectId
          }
        } catch (e) {
          console.warn('Bmob 创建失败（数据已保存到本地）:', e.message)
        }
      }

      return mission
    },

    /** 加载 Mission（Bmob 优先 → localStorage 兜底） */
    async loadMission(id) {
      this.loading = true
      this.error = null
      this.bmobLoadError = null
      try {
        // 优先从 Bmob 加载（已迁移后）
        if (this.migrated) {
          try {
            const bmobData = await fetchMission(id)
            if (bmobData) {
              // 加载认领数据
              if (bmobData._bmobObjectId) {
                try {
                  const assignments = await fetchAssignments(bmobData._bmobObjectId)
                  bmobData.assignments = assignments.map(a => ({
                    roleId: a.roleId,
                    userId: a.userId,
                    assignedAt: a.assignedAt,
                    status: a.status,
                    approvedBy: a.approvedBy || '',
                    approvedAt: a.approvedAt || ''
                  }))
                } catch (e) {
                  console.warn('加载认领数据失败:', e.message)
                }
              }
              // 写回 localStorage 作为缓存
              saveJSON(STORAGE_KEY_PREFIX + id, bmobData)
              this.currentMission = bmobData
              return bmobData
            }
          } catch (e) {
            this.bmobLoadError = '云端加载失败，使用本地缓存'
            console.warn('Bmob 加载失败，使用本地缓存:', e.message)
          }
        }

        // 兜底：从 localStorage 加载
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

    /** 软删除：Mission 移入回收站（同步 Bmob） */
    async deleteMission(id) {
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
      // Bmob 软删除
      if (this.migrated) {
        try { await softDeleteMission(id) } catch (e) { console.warn('Bmob 软删除失败:', e.message) }
      }
    },

    /** 永久删除：从回收站彻底移除（同步 Bmob） */
    async permanentlyDeleteMission(id) {
      removeKey(STORAGE_KEY_PREFIX + id)
      this.recycleBin = this.recycleBin.filter(i => i.id !== id)
      saveJSON(STORAGE_KEY_RECYCLE, this.recycleBin)
      // Bmob 永久删除
      if (this.migrated) {
        try { await hardDeleteMission(id) } catch (e) { console.warn('Bmob 永久删除失败:', e.message) }
      }
    },

    /** 从回收站恢复到主列表 */
    async restoreMission(id) {
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
      // Bmob 恢复（清除 deletedAt）
      if (this.migrated) {
        try { await saveMissionBmob(id, { deletedAt: null }) } catch (e) { console.warn('Bmob 恢复失败:', e.message) }
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
    async fetchIndex() {
      this.index = loadJSON(STORAGE_KEY_INDEX, [])
      this.recycleBin = loadJSON(STORAGE_KEY_RECYCLE, [])
      this._autoCleanRecycleBin()

      // 尝试从 Bmob 加载（已迁移后）
      if (this.migrated) {
        try {
          const bmobIndex = await fetchMissionIndex()
          if (bmobIndex && bmobIndex.length > 0) {
            // 合并: Bmob 数据为主，补充本地回收站状态
            this.index = bmobIndex.map(item => ({
              id: item.id || item.objectId,
              title: item.title || '',
              status: item.status || 'active',
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              _progress: item._progress || 0,
              _bmobObjectId: item._bmobObjectId
            }))
            // 缓存到 localStorage
            saveJSON(STORAGE_KEY_INDEX, this.index)
          }
        } catch (e) {
          console.warn('Bmob 索引加载失败，使用本地缓存:', e.message)
        }
      }

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
    async claimRole(roleId, userId) {
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
        this._syncAssignmentsToBmob()
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
        this._syncAssignmentsToBmob()
        return { success: true, pending: true }
      }

      if (role.claimPolicy.type === 'delegated') {
        return { success: false, reason: '该角色只能由管理员委派' }
      }

      return { success: false, reason: '未知的认领策略' }
    },

    /** 口令认领 */
    async claimRoleWithPassword(roleId, userId, password) {
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
      this._syncAssignmentsToBmob()
      return { success: true }
    },

    /** 审批认领 */
    async approveClaim(assignmentIndex, approvedBy) {
      if (!this.currentMission) return false
      const assignment = this.currentMission.assignments[assignmentIndex]
      if (!assignment || assignment.status !== 'pending') return false
      assignment.status = 'approved'
      assignment.approvedBy = approvedBy
      assignment.approvedAt = new Date().toISOString()
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      this._syncAssignmentsToBmob()
      return true
    },

    /** 拒绝认领 */
    async rejectClaim(assignmentIndex) {
      if (!this.currentMission) return false
      const assignment = this.currentMission.assignments[assignmentIndex]
      if (!assignment || assignment.status !== 'pending') return false
      assignment.status = 'rejected'
      this.currentMission.updatedAt = new Date().toISOString()
      this._saveMission()
      this._syncAssignmentsToBmob()
      return true
    },

    /** 委派角色（delegated） */
    async delegateRole(roleId, userId, delegatedBy) {
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
      this._syncAssignmentsToBmob()
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
      // 命名约定：名称不符的 fallback 到 observer（无转换），安全第一
      const nameMap = {
        // ── 基础角色 ──
        '普通成员': 'executor', '成员': 'executor', '执行人': 'executor',
        '班长': 'executor',     '组长': 'executor',  '发起人': 'executor',
        '自由成员': 'executor', '口令角色': 'executor',
        '需审批角色': 'executor', '委派角色': 'executor',
        // ── 审批类 ──
        '审批人': 'approver', '辅导员': 'approver', '总经理': 'approver',
        // ── 管理类 ──
        '管理员': 'admin', '负责人': 'admin',
        // ── 只读类 ──
        '观察员': 'observer', '⚪ 观察员': 'observer'
      }
      const key = nameMap[role.name]
      if (key && DEFAULT_PERMISSIONS[key]) return DEFAULT_PERMISSIONS[key]

      // 名称不匹配 → 最安全的默认：observer（无状态转换，只读）
      return DEFAULT_PERMISSIONS.observer
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
      const _isAdmin = userId === 'admin' && this.adminBypass
      const userRoleIds = this._getUserRoleIds(userId)

      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return { canOperate: false, reason: '节点不存在', roleIds: userRoleIds }

      // Step 2a: allowedOperators 白名单（节点级角色白名单）
      if (node.allowedOperators.length > 0) {
        const hasAllowedRole = node.allowedOperators.some(rId => userRoleIds.includes(rId))
        if (!hasAllowedRole && !_isAdmin) {
          return { canOperate: false, reason: '该节点仅限特定角色操作', roleIds: userRoleIds }
        }
      }

      // Step 2b: allowedUsers 白名单（节点级用户白名单）
      if (node.allowedUsers.length > 0 && !node.allowedUsers.includes(userId) && !_isAdmin) {
        return { canOperate: false, reason: '该节点仅限特定用户操作', roleIds: userRoleIds }
      }

      // Step 2c: 必须至少认领了一个允许操作该节点的角色
      //   - 如果 allowedOperators 有值 → 匹配其中的角色
      //   - 如果 allowedOperators 为空 → 匹配 assignedRole
      const matchingRoles = node.allowedOperators.length > 0
        ? node.allowedOperators
        : [node.assignedRole]
      const hasMatchingRole = matchingRoles.some(rId => userRoleIds.includes(rId))
      if (!hasMatchingRole && !_isAdmin) {
        return { canOperate: false, reason: '未认领该节点所需的角色，请先认领', roleIds: userRoleIds }
      }

      if (_isAdmin) return { canOperate: true, reason: '管理员权限', roleIds: userRoleIds }

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

      const _isAdmin = userId === 'admin' && this.adminBypass
      const node = this.currentMission.nodes.find(n => n.id === nodeId)
      if (!node) return []

      if (_isAdmin) {
        // 管理员（绕过）：返回所有可能的转换
        return this._getAllPossibleTransitions(node.status)
      }

      const userRoleIds = this._getUserRoleIds(userId)
      if (!userRoleIds.length) return []

      // 检查用户是否至少有一个角色能操作该节点
      //   - allowedOperators 有值 → 匹配其中的角色
      //   - allowedOperators 为空 → 匹配 assignedRole
      const allowedRoles = node.allowedOperators.length > 0
        ? node.allowedOperators
        : [node.assignedRole]
      const canOperate = userRoleIds.some(rId => allowedRoles.includes(rId))
      if (!canOperate) return []

      // 能操作后，使用用户所有已认领角色的转换（权限叠加）
      // 例如：用户同时有执行人(todo→进行中)和审核员(进行中→完成)，两者都可用
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

      const _isAdmin = userId === 'admin' && this.adminBypass
      if (_isAdmin) return { allowed: true, reason: '' }

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

      const _isAdmin = userId === 'admin' && this.adminBypass
      const nodeOp = this.checkNodeOperation(userId, nodeId)

      if (!nodeOp.canOperate && !_isAdmin) {
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
      const userRoleIds = _isAdmin
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
      if (_isAdmin) {
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

      const _isAdmin = userId === 'admin' && this.adminBypass
      if (_isAdmin) return 'editable'

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
    },

    /** 设置管理员权限绕过 */
    setAdminBypass(val) {
      this.adminBypass = !!val
      saveJSON(STORAGE_KEY_ADMIN_BYPASS, this.adminBypass)
    },

    // ──────────────── Bmob 同步 ────────────────

    /** 检查 Bmob 在线状态（静默） */
    async _checkOnline() {
      try {
        this.online = await checkBmobOnline()
      } catch {
        this.online = false
      }
    },

    /** 防抖保存到 Bmob（由 _saveMission 触发） */
    _bmbSaveDebounced: null,

    /** 保存当前 Mission 到 Bmob */
    async _saveToBmob() {
      if (!this.currentMission || !this.currentMission.id) return
      if (!this.migrated) return // 未迁移完成前不同步

      this.bmobSyncing = true
      try {
        const layoutData = JSON.stringify({
          nodes: this.currentMission.nodes,
          edges: this.currentMission.edges,
          roles: this.currentMission.roles,
          customFields: this.currentMission.customFields || [],
          reminders: this.currentMission.reminders || []
        })

        await saveMissionBmob(this.currentMission.id, {
          title: this.currentMission.title,
          description: this.currentMission.description,
          status: this.currentMission.status,
          tags: this.currentMission.tags,
          version: '4.0',
          layoutData
        })
      } catch (e) {
        this.bmobLoadError = '同步到云端失败: ' + e.message
        console.warn('Bmob 保存失败:', e.message)
      } finally {
        this.bmobSyncing = false
      }
    },

    /** 同步认领数据到 Bmob */
    async _syncAssignmentsToBmob() {
      if (!this.currentMission || !this.currentMission._bmobObjectId) return
      if (!this.migrated) return

      try {
        await syncAssignments(this.currentMission._bmobObjectId, this.currentMission.assignments)
      } catch (e) {
        console.warn('Bmob 认领同步失败:', e.message)
      }
    },

    /** 从 Bmob 加载认领数据并合并到 currentMission */
    async _loadAssignmentsFromBmob() {
      if (!this.currentMission || !this.currentMission._bmobObjectId) return
      try {
        const assignments = await fetchAssignments(this.currentMission._bmobObjectId)
        this.currentMission.assignments = assignments.map(a => ({
          roleId: a.roleId,
          userId: a.userId,
          assignedAt: a.assignedAt,
          status: a.status,
          approvedBy: a.approvedBy || '',
          approvedAt: a.approvedAt || ''
        }))
      } catch (e) {
        console.warn('Bmob 认领加载失败:', e.message)
      }
    },

    // ──────────────── localStorage → Bmob 迁移 ────────────────

    /** 迁移所有 localStorage 任务到 Bmob */
    async migrateLocalToBmob() {
      if (this.migrated) return
      this.loading = true
      this.error = null

      try {
        // 1. 检查网络
        const online = await checkBmobOnline()
        if (!online) {
          this.error = 'Bmob 不可用，无法迁移。请稍后再试。'
          return
        }

        // 2. 迁移索引中的每个任务
        const localIndex = loadJSON(STORAGE_KEY_INDEX, [])
        let migratedCount = 0

        for (const entry of localIndex) {
          const data = loadJSON(STORAGE_KEY_PREFIX + entry.id)
          if (!data) continue

          try {
            // 检查 Bmob 中是否已存在
            const existing = await fetchMission(entry.id)
            if (existing) {
              migratedCount++
              continue
            }

            // 创建到 Bmob
            await createMissionBmob(data)
            migratedCount++
          } catch (e) {
            console.warn(`迁移任务 ${entry.id} 失败:`, e.message)
          }
        }

        // 3. 标记迁移完成
        this.migrated = true
        saveJSON('missions:migrated', true)

        if (migratedCount > 0) {
          console.log(`✅ 迁移完成: ${migratedCount} 个任务已同步到 Bmob`)
        }
      } catch (e) {
        this.error = '迁移失败: ' + e.message
      } finally {
        this.loading = false
      }
    }
  }
})
