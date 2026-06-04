import Bmob from './bmob'

const USER_TABLE = '_User'
const ROLE_TABLE = 'UserRoles'

/** 登录 */
export async function login(username, password) {
  const user = await Bmob.User.login(username, password)
  const enriched = await enrichUser(user)
  // 写入 localStorage 持久化
  if (enriched) {
    localStorage.setItem('bmob_user_role', enriched.role)
  }
  return enriched
}

/** 注册 */
export async function register(params) {
  const user = await Bmob.User.register(params)
  const enriched = await enrichUser(user)
  if (enriched) {
    localStorage.setItem('bmob_user_role', enriched.role)
  }
  return enriched
}

/** 退出登录 */
export function logout() {
  localStorage.removeItem('bmob_user_role')
  Bmob.User.logout()
}

/** 获取当前用户 */
export function getCurrentUser() {
  const user = Bmob.User.current()
  if (!user) return null
  return normalizeUser(user)
}

/** 检查是否为管理员 */
export function isAdmin() {
  const user = getCurrentUser()
  if (!user) return false
  // 旧版 admin 账号兜底 + role 字段判断
  return user.role === 'admin' || user.username === 'admin'
}

/** 从 UserRoles 表获取用户角色 */
async function fetchUserRole(userId) {
  try {
    const q = Bmob.Query(ROLE_TABLE)
    q.equalTo('userId', '==', userId)
    const results = await q.find()
    if (results && results.length > 0) {
      return results[0].role || 'user'
    }
  } catch (e) {
    console.error('获取角色失败:', e)
  }
  return 'user'
}

/** 补充用户角色信息 */
async function enrichUser(user) {
  if (!user) return null
  const role = await fetchUserRole(user.objectId)
  return {
    id: user.objectId,
    username: user.username,
    email: user.email || '',
    role: role || 'user',
    mobilePhoneNumber: user.mobilePhoneNumber || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

/** 获取所有用户（管理员用）— 从 _User 表 + UserRoles 表合并 */
export async function getAllUsers() {
  // 查用户列表
  const q = Bmob.Query(USER_TABLE)
  q.limit(100)
  q.order('createdAt')
  const users = await q.find() || []

  // 查所有角色映射
  const roleQ = Bmob.Query(ROLE_TABLE)
  const roleRecords = await roleQ.find() || []
  const roleMap = {}
  roleRecords.forEach(r => { roleMap[r.userId] = r.role })

  return users.map(u => ({
    id: u.objectId,
    username: u.username || '',
    email: u.email || '',
    role: roleMap[u.objectId] || 'user',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }))
}

/** 设置用户角色（管理员用）— 写入 UserRoles 表 */
export async function setUserRole(userId, role, username) {
  // 查是否已有记录
  const q = Bmob.Query(ROLE_TABLE)
  q.equalTo('userId', '==', userId)
  const existing = await q.find()

  if (existing && existing.length > 0) {
    // 更新已有记录
    const uq = Bmob.Query(ROLE_TABLE)
    uq.set('id', existing[0].objectId)
    uq.set('role', role)
    await uq.save()
  } else {
    // 新建记录
    const nq = Bmob.Query(ROLE_TABLE)
    nq.set('userId', userId)
    nq.set('username', username || '')
    nq.set('role', role)
    await nq.save()
  }

  // 如果更新的是当前用户，刷新 localStorage
  const current = Bmob.User.current()
  if (current && current.objectId === userId) {
    localStorage.setItem('bmob_user_role', role)
  }
}

/** 规范化用户数据（用于本地缓存） */
function normalizeUser(user) {
  if (!user) return null
  // 从 localStorage 读取角色（跨页面刷新持久化），再 fallback 到 Bmob 缓存
  const role = localStorage.getItem('bmob_user_role') || user.role || 'user'
  return {
    id: user.objectId,
    username: user.username,
    email: user.email || '',
    role: role,
    mobilePhoneNumber: user.mobilePhoneNumber || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}
