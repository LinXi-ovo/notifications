/**
 * Tauri Bridge — 封装所有 Tauri invoke 调用
 *
 * 浏览器环境自动降级：所有方法在非 Tauri 环境中静默失效。
 * Vue 组件通过此模块访问原生能力，不直接调用 invoke()。
 */

import { invoke } from '@tauri-apps/api/core'

/** Tauri 环境检测 */
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

/** 封装 invoke 调用，非 Tauri 环境静默降级 */
function safeInvoke(command, args = {}) {
  if (!isTauri) {
    console.debug(`[Tauri] 非 Tauri 环境，跳过 invoke: ${command}`)
    return Promise.resolve(null)
  }
  return invoke(command, args).catch(err => {
    console.warn(`[Tauri] invoke ${command} 失败:`, err)
    return null
  })
}

export const tauri = {
  /** 发送系统桌面通知 */
  notify: (title, body, id) =>
    safeInvoke('send_notification', { title, body, id }),

  /** 触发 Bmob → SQLite 同步 */
  syncNow: () =>
    safeInvoke('sync_now'),

  /** 获取同步状态 */
  getSyncStatus: () =>
    safeInvoke('get_sync_status'),

  /** 获取缓存的单条通知 */
  getCachedNotification: (id) =>
    safeInvoke('get_cached_notification', { id }),

  /** 获取缓存的通知列表 */
  getCachedNotifications: (typeFilter) =>
    safeInvoke('get_cached_notifications', { typeFilter }),

  /** 获取缓存的分类 */
  getCachedCategories: () =>
    safeInvoke('get_cached_categories'),

  /** 设置开机自启 */
  setAutostart: (enabled) =>
    safeInvoke('set_autostart', { enabled }),

  /** 获取开机自启状态 */
  getAutostart: () =>
    safeInvoke('get_autostart'),

  /** 检测 Tauri 环境 */
  isTauri,
}
