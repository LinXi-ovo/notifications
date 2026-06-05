import { defineStore } from 'pinia'
import { tauri, isTauri } from '@/api/tauri'

/**
 * 同步状态 Store
 *
 * 管理 Tauri 模式下 Bmob ↔ SQLite 的同步状态。
 * 浏览器环境中所有操作静默降级。
 */
export const useSyncStore = defineStore('sync', {
  state: () => ({
    online: navigator.onLine,
    lastSyncAt: null,
    syncing: false,
    notificationCount: 0,
    categoryCount: 0,
    error: null,
  }),

  actions: {
    /** 检查 Tauri 环境 */
    _checkEnv() {
      if (!isTauri) {
        console.debug('[SyncStore] 非 Tauri 环境，跳过同步')
        return false
      }
      return true
    },

    /** 触发同步 */
    async sync() {
      if (!this._checkEnv()) return

      this.syncing = true
      this.error = null
      try {
        const result = await tauri.syncNow()
        if (result) {
          this.lastSyncAt = result.last_sync_at || new Date().toISOString()
          this.notificationCount = result.notification_count || 0
          this.categoryCount = result.category_count || 0
        }
        console.log('[SyncStore] 同步完成')
      } catch (e) {
        this.error = e.message || '同步失败'
        console.warn('[SyncStore] 同步失败:', e)
      } finally {
        this.syncing = false
      }
    },

    /** 获取同步状态 */
    async fetchStatus() {
      if (!this._checkEnv()) return

      try {
        const status = await tauri.getSyncStatus()
        if (status) {
          this.lastSyncAt = status.last_sync_at || null
          this.notificationCount = status.notification_count || 0
          this.categoryCount = status.category_count || 0
          this.online = status.online !== false
        }
      } catch (e) {
        console.warn('[SyncStore] 获取同步状态失败:', e)
      }
    },

    /** 发送桌面通知 */
    async notify(title, body, id) {
      if (!this._checkEnv()) return
      await tauri.notify(title, body, id)
    },

    /** 监听在线状态 */
    initOnlineListener() {
      window.addEventListener('online', () => { this.online = true })
      window.addEventListener('offline', () => { this.online = false })
    },

    /** 监听托盘同步事件（Tauri 后台触发的同步请求） */
    initTrayListener() {
      if (!isTauri) return
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('tray-sync', () => {
          console.log('[SyncStore] 托盘触发同步')
          this.sync()
        })
      }).catch(() => {})
    },

    /** 初始化全部监听器 */
    init() {
      this.initOnlineListener()
      this.initTrayListener()
      this.fetchStatus()
    },
  },
})
