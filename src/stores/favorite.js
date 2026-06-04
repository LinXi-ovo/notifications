import { defineStore } from 'pinia'
import { getFavorites, addFavorite, removeFavorite, isFavorited } from '@/api/favorite'

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    /** 当前用户收藏的通知 ID 集合 */
    ids: new Set(),
    /** 收藏的通知完整数据列表（用于收藏页） */
    list: [],
    /** 加载中 */
    loading: false
  }),

  actions: {
    /** 刷新收藏列表（仅 ID） */
    async refresh() {
      try {
        const ids = await getFavorites()
        this.ids = new Set(ids)
      } catch (e) {
        console.error('获取收藏失败:', e)
      }
    },

    /** 切换收藏状态 */
    async toggle(notificationId) {
      try {
        if (this.ids.has(notificationId)) {
          await removeFavorite(notificationId)
          this.ids.delete(notificationId)
          this.list = this.list.filter(n => n.id !== notificationId)
        } else {
          await addFavorite(notificationId)
          this.ids.add(notificationId)
        }
      } catch (e) {
        console.error('切换收藏失败:', e)
      }
    },

    /** 加载收藏的完整通知列表（用于收藏页） */
    async fetchFavorites({ getNotification } = {}) {
      if (!getNotification) return
      this.loading = true
      try {
        const ids = await getFavorites()
        this.ids = new Set(ids)
        const items = await Promise.all(
          ids.map(id => getNotification(id).catch(() => null))
        )
        this.list = items.filter(Boolean)
      } catch (e) {
        console.error('加载收藏列表失败:', e)
        this.list = []
      } finally {
        this.loading = false
      }
    }
  }
})
