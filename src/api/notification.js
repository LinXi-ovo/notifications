import Bmob from './bmob'

const TABLE = 'Notifications'

/** 获取通知列表（默认排除回收站的，默认不显示测试通知） */
export async function getNotifications({ type, search, page = 1, pageSize = 20, showTest } = {}) {
  const q = Bmob.Query(TABLE)

  // 排除已删除
  q.equalTo('deleted', '!=', true)

  // 分类筛选与测试通知过滤
  // 注意：不能在 type 字段上同时调用两次 equalTo（Bmob SDK 会覆盖），
  // 所以用 if/else 保证同一时刻只有一个 type 条件
  if (type) {
    // 特定分类：直接按分类过滤，测试通知由 type 值自身决定是否包含
    q.equalTo('type', '==', type)
  } else if (!showTest) {
    // "全部"视图且未开启测试通知显示 → 排除 test 类型
    q.equalTo('type', '!=', 'test')
  }
  // showTest=true 且 type=null（全部）→ 不添加任何 type 过滤，包含全部类型
  if (search) {
    q.equalTo('title', '==', { $regex: search })
  }

  q.order('-priority', '-createdAt')
  q.limit(pageSize)
  q.skip((page - 1) * pageSize)

  const results = await q.find() || []

  const countQ = Bmob.Query(TABLE)
  countQ.equalTo('deleted', '!=', true)
  if (type) {
    countQ.equalTo('type', '==', type)
  } else if (!showTest) {
    countQ.equalTo('type', '!=', 'test')
  }
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

/** 软删除：标记 deleted + 记录删除时间（送入回收站） */
export async function deleteNotification(id) {
  const q = Bmob.Query(TABLE)
  q.set('id', id)
  q.set('deleted', true)
  q.set('deletedAt', Date.now())
  return await q.save()
}

/** 获取回收站通知列表 */
export async function getTrashNotifications() {
  const q = Bmob.Query(TABLE)
  q.equalTo('deleted', '==', true)
  q.order('-deletedAt')
  q.limit(200)
  const results = await q.find() || []
  return results.map(normalizeNotification)
}

/** 从回收站恢复 */
export async function restoreNotification(id) {
  const q = Bmob.Query(TABLE)
  q.set('id', id)
  q.set('deleted', false)
  q.set('deletedAt', 0)
  return await q.save()
}

/** 永久删除（30 天后自动调用） */
export async function permanentlyDeleteNotification(id) {
  const q = Bmob.Query(TABLE)
  return await q.destroy(id)
}

/** 清理超过 30 天的回收站通知 */
export async function cleanExpiredTrash() {
  const q = Bmob.Query(TABLE)
  q.equalTo('deleted', '==', true)
  const items = await q.find() || []
  const now = Date.now()
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  for (const item of items) {
    if (item.deletedAt && (now - item.deletedAt > THIRTY_DAYS)) {
      try {
        const dq = Bmob.Query(TABLE)
        await dq.destroy(item.objectId)
      } catch (e) { /* ignore */ }
    }
  }
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
    deleted: !!item.deleted,
    deletedAt: item.deletedAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }
}
