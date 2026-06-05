import Bmob from './bmob'

const TABLE = 'KnowledgeItems'

/**
 * 获取所有启用的资讯（按优先级降序、创建时间降序）
 * @param {Object} [opts]
 * @param {number} [opts.limit] - 拉取上限，默认 50
 * @returns {Promise<Object[]>}
 */
export async function getActiveItems({ limit = 50 } = {}) {
  try {
    const q = Bmob.Query(TABLE)
    q.order('-createdAt')
    q.limit(limit)
    const results = await q.find()
    return results || []
  } catch (e) {
    console.warn('KnowledgeItems 表尚未创建或查询失败:', e?.message || e)
    return []
  }
}

/**
 * 获取所有资讯（含未启用，用于管理后台）
 * @param {Object} [opts]
 * @param {number} [opts.pageSize]
 * @param {number} [opts.page]
 * @returns {Promise<{list: Object[], total: number}>}
 */
export async function getAllItems({ pageSize = 100, page } = {}) {
  try {
    const q = Bmob.Query(TABLE)
    q.order('-createdAt')
    q.limit(pageSize)
    if (page !== undefined) q.skip(page * pageSize)
    const results = await q.find()
    return { list: results || [], total: (results || []).length }
  } catch (e) {
    console.warn('KnowledgeItems 表尚未创建:', e?.message || e)
    return { list: [], total: 0 }
  }
}

/**
 * 获取单条资讯详情
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getItem(id) {
  const q = Bmob.Query(TABLE)
  try {
    return await q.get(id)
  } catch {
    return null
  }
}

/**
 * 创建新资讯
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createItem(data) {
  const q = Bmob.Query(TABLE)
  Object.entries(data).forEach(([key, value]) => {
    q.set(key, value)
  })
  return await q.save()
}

/**
 * 更新资讯
 * @param {string} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateItem(id, data) {
  const q = Bmob.Query(TABLE)
  Object.entries(data).forEach(([key, value]) => {
    q.set(key, value)
  })
  return await q.save(id)
}

/**
 * 永久删除资讯
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteItem(id) {
  const q = Bmob.Query(TABLE)
  await q.destroy(id)
}
