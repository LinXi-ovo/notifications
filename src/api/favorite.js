import Bmob from './bmob'

const TABLE = 'Favorites'

/** 获取当前用户收藏的所有通知 ID */
export async function getFavorites() {
  const q = Bmob.Query(TABLE)
  const user = Bmob.User.current()
  if (user) q.equalTo('userId', '==', user.objectId)
  const results = await q.find() || []
  return results.map(item => item.notificationId)
}

/** 收藏通知 */
export async function addFavorite(notificationId) {
  const user = Bmob.User.current()
  if (!user) throw new Error('未登录')

  const q = Bmob.Query(TABLE)
  q.set('userId', user.objectId)
  q.set('notificationId', notificationId)
  return await q.save()
}

/** 取消收藏 */
export async function removeFavorite(notificationId) {
  const user = Bmob.User.current()
  if (!user) throw new Error('未登录')

  // 找到对应的收藏记录
  const q = Bmob.Query(TABLE)
  q.equalTo('userId', '==', user.objectId)
  q.equalTo('notificationId', '==', notificationId)
  const results = await q.find()

  if (results && results.length > 0) {
    const dq = Bmob.Query(TABLE)
    return await dq.destroy(results[0].objectId)
  }
}

/** 检查是否已收藏 */
export async function isFavorited(notificationId) {
  const user = Bmob.User.current()
  if (!user) return false

  const q = Bmob.Query(TABLE)
  q.equalTo('userId', '==', user.objectId)
  q.equalTo('notificationId', '==', notificationId)
  const results = await q.find()
  return results && results.length > 0
}
