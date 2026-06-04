import Bmob from './bmob'

const USER_TABLE = '_User'

/** 登录 */
export async function login(username, password) {
  const user = await Bmob.User.login(username, password)
  return normalizeUser(user)
}

/** 注册 */
export async function register(params) {
  const user = await Bmob.User.register(params)
  return normalizeUser(user)
}

/** 退出登录 */
export function logout() {
  Bmob.User.logout()
}

/** 获取当前用户 */
export function getCurrentUser() {
  const user = Bmob.User.current()
  return user ? normalizeUser(user) : null
}

/** 检查是否为管理员 */
export function isAdmin() {
  const user = getCurrentUser()
  if (!user) return false
  return user.role === 'admin' || user.username === 'admin'
}

/** 获取所有用户（管理员用） */
export async function getAllUsers() {
  const q = Bmob.Query(USER_TABLE)
  q.limit(100)
  q.order('createdAt')
  const results = await q.find() || []
  return results.map(normalizeUser)
}

/** 设置用户角色（管理员用） */
export async function setUserRole(userId, role) {
  const q = Bmob.Query(USER_TABLE)
  q.set('id', userId)
  q.set('role', role)
  const result = await q.save()

  // 如果更新的是当前用户，刷新本地缓存
  const current = Bmob.User.current()
  if (current && current.objectId === userId) {
    current.role = role
  }
  return result
}

/** 规范化用户数据 */
function normalizeUser(user) {
  if (!user) return null
  return {
    id: user.objectId,
    username: user.username,
    email: user.email || '',
    role: user.role || 'user',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}
