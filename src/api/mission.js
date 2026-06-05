/**
 * Mission Bmob API 封装
 *
 * Mission 表字段: title, description, createdBy(Pointer), status, tags,
 *                  version, layoutData(String), deletedAt, pendingSync
 * MissionAssignment 表字段: missionId(Pointer), userId(Pointer), roleId,
 *                           status, assignedAt, approvedBy, approvedAt
 *
 * 命名约定:
 *   客户端 ID (mission-xxx) 作为 missionId 字段存在 Bmob 中
 *   Bmob objectId 由系统自动生成，映射表存在 localStorage missions:idmap
 *   加载时优先通过 missionId 字段查询
 */
import Bmob from './bmob'

const TABLE_MISSION = 'Mission'
const TABLE_ASSIGNMENT = 'MissionAssignmen'
const STORAGE_KEY_IDMAP = 'missions:idmap'

// ── ID 映射 ──

/**
 * 加载 ID 映射表 (mission-xxx → bmobObjectId)
 * 用于通过 missionId 反查 Bmob objectId
 */
function loadIdMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_IDMAP)) || {}
  } catch {
    return {}
  }
}

function saveIdMap(map) {
  localStorage.setItem(STORAGE_KEY_IDMAP, JSON.stringify(map))
}

function getBmobId(missionId) {
  return loadIdMap()[missionId]
}

function setBmobId(missionId, bmobId) {
  const map = loadIdMap()
  map[missionId] = bmobId
  saveIdMap(map)
}

function removeBmobId(missionId) {
  const map = loadIdMap()
  delete map[missionId]
  saveIdMap(map)
}

// ── Mission CRUD ──

/**
 * 获取任务索引列表（不含 deletedAt 的）
 * @returns {Promise<Array>}
 */
export async function fetchMissionIndex() {
  const q = Bmob.Query(TABLE_MISSION)
  q.equalTo('deletedAt', '==', null)
  q.order('-updatedAt')
  q.limit(100)
  const results = await q.find()
  return (results || []).map(normalizeMissionIndexItem)
}

/**
 * 通过 missionId (client ID) 获取单个任务
 * @param {string} missionId — 格式 mission-xxx
 * @returns {Promise<Object|null>}
 */
export async function fetchMission(missionId) {
  // 优先按 missionId 字段查询
  try {
    const q = Bmob.Query(TABLE_MISSION)
    q.equalTo('missionId', '==', missionId)
    q.limit(1)
    const results = await q.find()
    if (results && results.length > 0) {
      return normalizeMission(results[0])
    }
  } catch (e) {
    console.warn('按 missionId 查询失败，尝试按 objectId:', e.message)
  }

  // 回退：通过 ID 映射表按 objectId 查询
  const bmobId = getBmobId(missionId)
  if (bmobId) {
    try {
      const q = Bmob.Query(TABLE_MISSION)
      const result = await q.get(bmobId)
      if (result) return normalizeMission(result)
    } catch (e) {
      console.warn('按 objectId 查询失败:', e.message)
    }
  }

  return null
}

/**
 * 创建新任务到 Bmob
 * @param {Object} mission — 完整 mission 对象（含 clientId mission-xxx）
 * @returns {Promise<Object>} 保存后的任务
 */
export async function createMission(mission) {
  const q = Bmob.Query(TABLE_MISSION)
  q.set('missionId', mission.id)
  q.set('title', mission.title)
  q.set('description', mission.description || '')
  q.set('status', mission.status || 'active')
  q.set('tags', mission.tags || [])
  q.set('version', '4.0')
  q.set('layoutData', JSON.stringify({
    nodes: mission.nodes || [],
    edges: mission.edges || [],
    roles: mission.roles || [],
    customFields: mission.customFields || [],
    reminders: mission.reminders || []
  }))
  q.set('pendingSync', 'false')

  if (mission.createdBy) {
    // createdBy 必须是 Bmob Pointer（指向 _User 表）
    if (typeof mission.createdBy === 'object' && mission.createdBy.objectId) {
      q.set('createdBy', { __type: 'Pointer', className: '_User', objectId: mission.createdBy.objectId })
    } else {
      // 字符串用户名 → 从 Bmob 当前用户获取 objectId 构造 Pointer
      try {
        const currentUser = Bmob.User.current()
        if (currentUser && currentUser.objectId) {
          q.set('createdBy', { __type: 'Pointer', className: '_User', objectId: currentUser.objectId })
        }
      } catch (e) {
        console.warn('无法获取当前用户 objectId 构造 Pointer:', e)
      }
    }
  }

  const result = await q.save()
  // 保存 ID 映射
  if (result && result.objectId) {
    setBmobId(mission.id, result.objectId)
  }
  return normalizeMission(result)
}

/**
 * 更新任务（保存 layoutData 等字段）
 * @param {string} missionId
 * @param {Object} data — { title?, description?, status?, tags?, layoutData?, deletedAt?, pendingSync? }
 * @returns {Promise<Object>}
 */
export async function saveMission(missionId, data) {
  const bmobId = getBmobId(missionId)
  if (!bmobId) {
    // 还没有映射 → 尝试按 missionId 查找
    const existing = await fetchMission(missionId)
    if (existing && existing._bmobObjectId) {
      setBmobId(missionId, existing._bmobObjectId)
      return await saveMission(missionId, data)
    }
    throw new Error(`Mission ${missionId} 在 Bmob 中不存在`)
  }

  const q = Bmob.Query(TABLE_MISSION)
  q.set('id', bmobId)

  if (data.title !== undefined) q.set('title', data.title)
  if (data.description !== undefined) q.set('description', data.description)
  if (data.status !== undefined) q.set('status', data.status)
  if (data.tags !== undefined) q.set('tags', data.tags)
  if (data.version !== undefined) q.set('version', data.version)
  if (data.layoutData !== undefined) q.set('layoutData', data.layoutData)
  if (data.deletedAt !== undefined) q.set('deletedAt', data.deletedAt)
  if (data.pendingSync !== undefined) q.set('pendingSync', String(data.pendingSync))

  const result = await q.save()
  return normalizeMission(result)
}

/**
 * 软删除任务（设置 deletedAt）
 * @param {string} missionId
 */
export async function softDeleteMission(missionId) {
  await saveMission(missionId, { deletedAt: new Date().toISOString() })
}

/**
 * 永久删除任务（从 Bmob 彻底移除）
 * @param {string} missionId
 */
export async function hardDeleteMission(missionId) {
  const bmobId = getBmobId(missionId)
  if (bmobId) {
    try {
      await Bmob.Query(TABLE_MISSION).destroy(bmobId)
    } catch (e) {
      console.warn('永久删除失败:', e.message)
    }
    removeBmobId(missionId)
  }
}

// ── MissionAssignment CRUD ──

/**
 * 获取某任务的所有认领
 * @param {string} bmobObjectId — Bmob Mission objectId
 * @returns {Promise<Array>}
 */
export async function fetchAssignments(bmobObjectId) {
  const pointer = Bmob.Pointer(TABLE_MISSION, bmobObjectId)
  const q = Bmob.Query(TABLE_ASSIGNMENT)
  q.equalTo('missionId', '==', pointer)
  const results = await q.find()
  return (results || []).map(normalizeAssignment)
}

/**
 * 同步认领数据（全量替换）
 * 策略: 删除云端有但本地没有的，新增本地有但云端没有的
 * @param {string} bmobObjectId — Bmob Mission objectId
 * @param {Array} localAssignments — 本地认领数组
 */
export async function syncAssignments(bmobObjectId, localAssignments) {
  const pointer = Bmob.Pointer(TABLE_MISSION, bmobObjectId)
  const cloudAssignments = await fetchAssignments(bmobObjectId)

  // 构建 key 映射 (userId+roleId → cloud record)
  const cloudMap = {}
  for (const a of cloudAssignments) {
    const key = `${a.userId}:${a.roleId}`
    cloudMap[key] = a
  }

  const localMap = {}
  for (const a of localAssignments) {
    const key = `${a.userId}:${a.roleId}`
    localMap[key] = a
  }

  // 删除云端多余
  for (const [key, record] of Object.entries(cloudMap)) {
    if (!localMap[key] && record.objectId) {
      try {
        await Bmob.Query(TABLE_ASSIGNMENT).destroy(record.objectId)
      } catch (e) {
        console.warn('删除认领失败:', e.message)
      }
    }
  }

  // 新增或更新本地有但云端没有/不同的
  for (const [key, local] of Object.entries(localMap)) {
    const cloud = cloudMap[key]
    const q = Bmob.Query(TABLE_ASSIGNMENT)

    if (cloud && cloud.objectId) {
      // 更新
      q.set('id', cloud.objectId)
    }
    // 否则新建（不需 set id）

    q.set('missionId', pointer)
    q.set('userId', local.userId)
    q.set('roleId', local.roleId)
    q.set('status', local.status || 'pending')
    q.set('assignedAt', local.assignedAt || new Date().toISOString())

    if (local.approvedBy) q.set('approvedBy', local.approvedBy)
    if (local.approvedAt) q.set('approvedAt', local.approvedAt)

    try {
      await q.save()
    } catch (e) {
      console.warn('同步认领失败:', e.message)
    }
  }
}

/**
 * 获取用户参与的所有任务列表
 * @param {string} userId
 * @returns {Promise<Array>} — [{ mission, assignment }]
 */
export async function getUserMissions(userId) {
  const q = Bmob.Query(TABLE_ASSIGNMENT)
  q.equalTo('userId', '==', userId)
  // 不追加 equalTo 避免 SDK 生成 $and 语法（Bmob 对 $and 支持有限）
  let assignments = []
  try {
    assignments = await q.find()
  } catch (e) {
    // Bmob 返回 code 101 表示表不存在，静默忽略
    if (e.code === 101) {
      console.warn('MissionAssignmen 表不存在，跳过任务加载')
    } else {
      console.warn('查询 MissionAssignmen 失败:', e.error || JSON.stringify(e))
    }
    return []
  }
  if (!assignments || !assignments.length) return []

  // 客户端过滤 approved 状态
  assignments = assignments.filter(a => a.status === 'approved')
  if (!assignments.length) return []

  // 去重提取任务 ID
  const missionIds = [...new Set(
    assignments.map(a => a.missionId?.objectId).filter(Boolean)
  )]

  // 并行查询任务详情（含 layoutData 中的进度信息）
  const missions = await Promise.allSettled(
    missionIds.map(id => {
      const mq = Bmob.Query(TABLE_MISSION)
      return mq.get(id)
    })
  )

  return missions
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => normalizeMission(r.value))
}

// ── 同步辅助 ──

/**
 * 检查网络/Bmob 是否可用
 * @returns {Promise<boolean>}
 */
export async function checkBmobOnline() {
  try {
    const q = Bmob.Query(TABLE_MISSION)
    q.limit(1)
    await q.find()
    return true
  } catch {
    return false
  }
}

// ── 数据归一化 ──

/**
 * 将 Bmob 查询结果转为 Mission 索引项
 */
function normalizeMissionIndexItem(raw) {
  return {
    id: raw.missionId || raw.objectId,
    title: raw.title || '',
    status: raw.status || 'active',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    _bmobObjectId: raw.objectId,
    _progress: computeProgress(raw.layoutData)
  }
}

/**
 * 将 Bmob 查询结果转为完整 Mission 对象
 */
function normalizeMission(raw) {
  if (!raw) return null

  // 解析 layoutData JSON
  let layout = { nodes: [], edges: [], roles: [], customFields: [], reminders: [] }
  if (raw.layoutData) {
    try {
      layout = JSON.parse(raw.layoutData)
    } catch (e) {
      console.warn('解析 layoutData 失败:', e.message)
    }
  }

  return {
    id: raw.missionId || raw.objectId,
    title: raw.title || '',
    description: raw.description || '',
    createdBy: raw.createdBy?.objectId || raw.createdBy || '',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    status: raw.status || 'active',
    tags: raw.tags || [],
    version: raw.version || '4.0',
    _bmobObjectId: raw.objectId,
    // layout 数据
    nodes: layout.nodes || [],
    edges: layout.edges || [],
    roles: layout.roles || [],
    customFields: layout.customFields || [],
    reminders: layout.reminders || [],
    // 认领数据（由外部填充）
    assignments: []
  }
}

/**
 * 将 Bmob 查询结果转为 Assignment 对象
 */
function normalizeAssignment(raw) {
  if (!raw) return null
  return {
    roleId: raw.roleId || '',
    userId: raw.userId?.objectId || raw.userId || '',
    assignedAt: raw.assignedAt || raw.createdAt,
    status: raw.status || 'pending',
    approvedBy: raw.approvedBy || '',
    approvedAt: raw.approvedAt || '',
    objectId: raw.objectId,
    _missionId: raw.missionId?.objectId
  }
}

/**
 * 从 layoutData JSON 中提取进度
 */
function computeProgress(layoutData) {
  if (!layoutData) return 0
  try {
    const layout = typeof layoutData === 'string' ? JSON.parse(layoutData) : layoutData
    const nodes = layout.nodes || []
    if (!nodes.length) return 0
    const done = nodes.filter(n => n.status === 'completed').length
    return Math.round((done / nodes.length) * 100)
  } catch {
    return 0
  }
}
