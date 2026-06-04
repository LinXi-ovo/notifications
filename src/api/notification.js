import Bmob from './bmob'

const TABLE = 'Notifications'

/** 获取通知列表 */
export async function getNotifications({ type, search, page = 1, pageSize = 20 } = {}) {
  const q = Bmob.Query(TABLE)

  if (type) q.equalTo('type', '==', type)
  if (search) {
    // Bmob 模糊搜索需付费套餐，先用客户端过滤
    q.equalTo('title', '==', { $regex: search })
  }

  q.order('-priority', '-createdAt')
  q.limit(pageSize)
  q.skip((page - 1) * pageSize)

  const results = await q.find() || []

  // 获取总数
  const countQ = Bmob.Query(TABLE)
  if (type) countQ.equalTo('type', '==', type)
  let total = results.length
  try { total = await countQ.count() } catch (e) { /* fallback */ }

  const data = results.map(normalizeNotification)

  return { data, total, page, pageSize }
}

/** 获取单条通知 */
export async function getNotification(id) {
  const q = Bmob.Query(TABLE)
  const item = await q.get(id)
  return normalizeNotification(item)
}

/** 创建通知 */
export async function createNotification(data) {
  const q = Bmob.Query(TABLE)
  Object.keys(data).forEach(key => q.set(key, data[key]))
  const result = await q.save()
  return result
}

/** 更新通知 */
export async function updateNotification(id, data) {
  const q = Bmob.Query(TABLE)
  q.set('id', id)
  Object.keys(data).forEach(key => q.set(key, data[key]))
  const result = await q.save()
  return result
}

/** 删除通知 */
export async function deleteNotification(id) {
  const q = Bmob.Query(TABLE)
  return await q.destroy(id)
}

/** 规范化通知数据（字段映射） */
function normalizeNotification(item) {
  if (!item) return null
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
    updatedAt: item.updatedAt
  }
}
