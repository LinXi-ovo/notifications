import Bmob from './bmob'

/** 登录 */
export async function login(username, password) {
  return await Bmob.User.login(username, password)
}

/** 注册 */
export async function register(params) {
  return await Bmob.User.register(params)
}

/** 退出登录 */
export function logout() {
  Bmob.User.logout()
}

/** 获取当前用户 */
export function getCurrentUser() {
  return Bmob.User.current()
}

/** 检查是否为管理员 */
export function isAdmin() {
  const user = getCurrentUser()
  if (!user) return false
  return user.username === 'admin'
}
