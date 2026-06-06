/**
 * Bmob REST API Client
 *
 * 通过 Bmob 的 REST API（Parse 兼容）操作数据。
 * 不需要 hydrogen-js-sdk，纯 fetch + headers 认证。
 *
 * API 文档: https://www.bmobapp.com/doc/rest/develop_doc/
 */

// Bmob REST API 基础
const API_BASE = 'https://api.bmobapp.com/1'
const HEADERS = {
  'X-Bmob-Application-Id': '',
  'X-Bmob-REST-API-Key': '',
  'Content-Type': 'application/json',
}

/** 获取当前环境变量中的 Bmob 密钥 */
export function initBmobFromEnv(env) {
  const appId = env.VITE_BMOB_SECRET_KEY
  const apiKey = env.VITE_BMOB_API_SAFE_CODE
  if (!appId || !apiKey) {
    throw new Error(
      'Bmob 未配置。请在 .env 中设置 VITE_BMOB_SECRET_KEY 和 VITE_BMOB_API_SAFE_CODE，\n' +
      '或通过环境变量传入。'
    )
  }
  HEADERS['X-Bmob-Application-Id'] = appId
  HEADERS['X-Bmob-REST-API-Key'] = apiKey
}

/**
 * 通用请求
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {string} path - 如 /classes/Notifications
 * @param {object} [body] - 仅 POST/PUT
 * @returns {Promise<object>}
 */
async function request(method, path, body) {
  const url = `${API_BASE}${path}`
  const opts = { method, headers: HEADERS }
  if (body && (method === 'POST' || method === 'PUT')) {
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(url, opts)
  // Bmob 错误可能在 body 中返回
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      msg = errBody.error || msg
    } catch {}
    throw new Error(msg)
  }
  // DELETE 可能无 body
  if (method === 'DELETE') return { success: true }
  return await res.json()
}

// ═══════════════════════════════════
//  Notifications
// ═══════════════════════════════════

const TABLE_NOTIF = '/classes/Notifications'

/**
 * 获取通知列表
 * @param {object} [opts]
 * @param {number} [opts.page=1]
 * @param {number} [opts.pageSize=20]
 * @param {string} [opts.type] - 分类筛选
 * @param {string} [opts.search] - 标题搜索
 * @param {boolean} [opts.showTest=false]
 * @returns {Promise<{data: object[], total: number}>}
 */
export async function listNotifications(opts = {}) {
  const { page = 1, pageSize = 20, type, search, showTest } = opts
  const where = { deleted: { $ne: true } }
  if (type) where.type = type
  if (!showTest) where.type = { $ne: 'test' }

  let path = `${TABLE_NOTIF}?where=${encodeURIComponent(JSON.stringify(where))}&order=-priority,-createdAt&limit=${pageSize}&skip=${(page - 1) * pageSize}`
  if (search) path += `&title=${encodeURIComponent(search)}`

  const data = await request('GET', path)
  const results = data.results || []

  // 获取总数
  let total = results.length
  try {
    const countRes = await request('GET', `${TABLE_NOTIF}?where=${encodeURIComponent(JSON.stringify(where))}&count=1&limit=0`)
    total = countRes.count || total
  } catch {}

  return {
    data: results.map(normalizeNotification),
    total,
    page,
    pageSize,
  }
}

/**
 * 获取单条通知
 * @param {string} objectId
 */
export async function getNotification(objectId) {
  const data = await request('GET', `${TABLE_NOTIF}/${objectId}`)
  return normalizeNotification(data)
}

/**
 * 搜索通知（标题）
 * @param {string} keyword
 * @param {object} [opts]
 */
export async function searchNotifications(keyword, opts = {}) {
  const { page = 1, pageSize = 20 } = opts
  const where = {
    deleted: { $ne: true },
    title: { $regex: keyword },
  }
  const path = `${TABLE_NOTIF}?where=${encodeURIComponent(JSON.stringify(where))}&order=-createdAt&limit=${pageSize}&skip=${(page - 1) * pageSize}`
  const data = await request('GET', path)
  return {
    data: (data.results || []).map(normalizeNotification),
    total: data.results?.length || 0,
  }
}

/** 通知字段映射 */
function normalizeNotification(item) {
  return {
    id: item.objectId,
    title: item.title || '',
    content: item.content || '',
    type: item.type || 'other',
    sourceGroup: item.sourceGroup || '',
    sourcePerson: item.sourcePerson || '',
    originalLink: item.originalLink || '',
    priority: item.priority ?? 0,
    tags: item.tags || [],
    status: item.status || 'active',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

// ═══════════════════════════════════
//  Missions
// ═══════════════════════════════════

const TABLE_MISSION = '/classes/Missions'

/**
 * 获取任务列表
 * @param {object} [opts]
 * @param {number} [opts.pageSize=50]
 */
export async function listMissions(opts = {}) {
  const { pageSize = 50 } = opts
  const where = { deletedAt: { $ne: true } }
  const path = `${TABLE_MISSION}?where=${encodeURIComponent(JSON.stringify(where))}&order=-updatedAt&limit=${pageSize}`
  const data = await request('GET', path)
  return {
    data: (data.results || []).map(m => ({
      id: m.missionId || m.objectId,
      title: m.title || '',
      status: m.status || 'active',
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
    total: data.results?.length || 0,
  }
}

/**
 * 获取单个任务
 * @param {string} id - missionId
 */
export async function getMission(id) {
  const where = { missionId: id }
  const path = `${TABLE_MISSION}?where=${encodeURIComponent(JSON.stringify(where))}&limit=1`
  const data = await request('GET', path)
  const results = data.results || []
  if (results.length === 0) return null
  const item = results[0]
  // layoutData 是 JSON 字符串
  let layoutData = {}
  try {
    if (item.layoutData) layoutData = JSON.parse(item.layoutData)
  } catch {}
  return {
    id: item.missionId || item.objectId,
    objectId: item.objectId,
    title: item.title || '',
    description: item.description || '',
    status: item.status || 'active',
    roles: layoutData.roles || [],
    nodes: layoutData.nodes || [],
    edges: layoutData.edges || [],
    customFields: layoutData.customFields || [],
    assignments: item.assignments || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

// ═══════════════════════════════════
//  Categories
// ═══════════════════════════════════

const TABLE_CAT = '/classes/Categories'

/** 获取全部分类 */
export async function listCategories() {
  const path = `${TABLE_CAT}?order=sortOrder`
  const data = await request('GET', path)
  return {
    data: (data.results || []).map(c => ({
      id: c.objectId,
      name: c.name,
      value: c.value,
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    })),
    total: data.results?.length || 0,
  }
}

// ═══════════════════════════════════
//  Knowledge Items
// ═══════════════════════════════════

const TABLE_KNOW = '/classes/KnowledgeItems'

/** 获取启用的资讯 */
export async function listKnowledgeItems(opts = {}) {
  const { limit = 20 } = opts
  const path = `${TABLE_KNOW}?order=-createdAt&limit=${limit}`
  const data = await request('GET', path)
  return {
    data: (data.results || []).map(k => ({
      id: k.objectId,
      title: k.title || '',
      content: k.content || '',
      category: k.category || 'tip',
      source: k.source || '',
      priority: k.priority ?? 0,
      tags: k.tags || [],
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    })),
    total: data.results?.length || 0,
  }
}
