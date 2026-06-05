import { defineStore } from 'pinia'
import { getActiveItems } from '@/api/knowledge'
import { createItem, updateItem, deleteItem, getAllItems, getItem } from '@/api/knowledge'
import {
  loadUserState,
  saveUserState,
  createDefaultUserState
} from '@/types/knowledge'

/**
 * 每日资讯 Pinia Store
 *
 * 数据流：Bmob 拉取 → 过滤已读 → 队列 → 展示
 * 状态持久化：localStorage（已读/收藏/关闭状态）
 */
export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    /** 当前拉取的资讯列表（缓存） */
    items: [],
    /** 用户本地状态 */
    userState: loadUserState(),
    /** 当前展示的资讯对象 */
    currentItem: null,
    /** 当前是否在浏览历史（回看模式） */
    browsingHistory: false,
    /** 是否正在加载 */
    loading: false,
    /** 今日日期字符串 YYYY-MM-DD */
    today: ''
  }),

  getters: {
    /** 未读队列（排除已看、不重复推送） */
    unreadQueue(state) {
      const today = state.today
      const isToday = state.userState.lastFetchDate === today
      if (!isToday) return state.items // 今天还没检查过，全量
      return state.items.filter(item => !state.userState.viewedIds.includes(item.objectId || item.id))
    },

    /** 未读数量 */
    unreadCount() {
      return this.unreadQueue.length
    },

    /** 当前在队列中的索引 */
    currentIndex(state) {
      if (!state.currentItem) return -1
      const queue = this.unreadQueue
      if (this.browsingHistory) return -1
      return queue.findIndex(item => (item.objectId || item.id) === (state.currentItem.objectId || state.currentItem.id))
    },

    /** 是否有上一条 */
    hasPrevious(state) {
      if (this.browsingHistory) {
        // 历史回看模式
        const all = [...state.userState.viewedIds].reverse()
        const idx = all.indexOf(state.currentItem?.objectId || state.currentItem?.id)
        return idx < all.length - 1
      }
      return this.currentIndex > 0
    },

    /** 是否有下一条 */
    hasNext(state) {
      if (this.browsingHistory) return false
      return this.currentIndex < this.unreadQueue.length - 1
    },

    /** 是否全部已读 */
    allRead() {
      return this.items.length > 0 && this.unreadQueue.length === 0
    },

    /** 某条资讯是否已收藏 */
    isFavorite() {
      return (id) => this.userState.favoriteIds.includes(id)
    },

    /** 调试信息：当前状态快照 */
    debugInfo(state) {
      return {
        today: state.today,
        itemsCount: state.items.length,
        currentItemId: state.currentItem?.objectId || state.currentItem?.id || null,
        browsingHistory: state.browsingHistory,
        loading: state.loading,
        userState: { ...state.userState, viewedIds: [...state.userState.viewedIds], favoriteIds: [...state.userState.favoriteIds] },
        unreadCount: state.items.filter(item => !state.userState.viewedIds.includes(item.objectId || item.id)).length,
        allRead: state.items.length > 0 && state.items.every(item => state.userState.viewedIds.includes(item.objectId || item.id))
      }
    }
  },

  actions: {
    /**
     * 从 Bmob 拉取 isActive=true 的资讯
     * 同时更新 today 日期
     */
    async fetchItems() {
      this.loading = true
      try {
        this.today = new Date().toISOString().slice(0, 10)
        const results = await getActiveItems({ limit: 50 })
        this.items = results || []
      } catch (e) {
        console.warn('拉取资讯失败，表可能尚未创建:', e?.message || e)
        this.items = []
      } finally {
        this.loading = false
      }
    },

    /**
     * 检测是否该推送给用户，并推送下一条
     * 由 HomeView onMounted 或路由进入时调用
     */
    async checkAndPush() {
      await this.fetchItems()

      const today = this.today

      // 重置——如果新的一天
      if (this.userState.lastFetchDate !== today) {
        this.userState.viewedIds = []
        this.userState.dismissed = false
        this.userState.lastFetchDate = today
        this.userState.lastShownIndex = 0
        this.browsingHistory = false
        this.saveState()
      }

      // 已手动关闭
      if (this.userState.dismissed) {
        this.currentItem = null
        return
      }

      // 找未读队列的第一条
      const queue = this.unreadQueue
      if (queue.length > 0) {
        this.currentItem = queue[0]
        this.browsingHistory = false
      } else {
        // 全部已读 — 进入已读完成状态
        this.currentItem = null
      }
    },

    /**
     * 标记为已读
     * @param {string} id
     */
    markViewed(id) {
      if (!id || this.userState.viewedIds.includes(id)) return
      this.userState.viewedIds.push(id)
      this.userState.lastShownIndex = this.userState.viewedIds.length
      this.saveState()

      // 自动推进到下一条（如果有）
      const queue = this.unreadQueue
      if (queue.length > 0) {
        this.currentItem = queue[0]
      } else {
        this.currentItem = null
      }
    },

    /** 切换收藏 */
    toggleFavorite(id) {
      const idx = this.userState.favoriteIds.indexOf(id)
      if (idx > -1) {
        this.userState.favoriteIds.splice(idx, 1)
      } else {
        this.userState.favoriteIds.push(id)
      }
      this.saveState()
    },

    /** 当天关闭卡片（dismissed） */
    dismissToday() {
      this.userState.dismissed = true
      this.currentItem = null
      this.saveState()
    },

    /** 上一条 */
    showPrevious() {
      if (this.browsingHistory) {
        // 历史回看
        const all = [...this.userState.viewedIds].reverse()
        const currentId = this.currentItem?.objectId || this.currentItem?.id
        const idx = all.indexOf(currentId)
        if (idx < all.length - 1) {
          const prevId = all[idx + 1]
          const item = this.items.find(i => (i.objectId || i.id) === prevId)
          if (item) this.currentItem = item
        }
        return
      }
      const queue = this.unreadQueue
      const idx = this.currentIndex
      if (idx > 0 && queue[idx - 1]) {
        this.currentItem = queue[idx - 1]
      }
    },

    /** 下一条 */
    showNext() {
      if (this.browsingHistory) return
      const queue = this.unreadQueue
      const idx = this.currentIndex
      if (idx >= 0 && idx < queue.length - 1 && queue[idx + 1]) {
        this.currentItem = queue[idx + 1]
      }
    },

    /** 重新展开卡片（从折叠态） */
    restoreCard() {
      if (this.allRead) {
        // 全部已读后重新展开 = 回看历史
        this.browsingHistory = true
        const viewed = [...this.userState.viewedIds].reverse()
        const lastId = viewed[0]
        if (lastId) {
          const item = this.items.find(i => (i.objectId || i.id) === lastId)
          if (item) this.currentItem = item
        }
      } else {
        this.userState.dismissed = false
        this.browsingHistory = false
        const queue = this.unreadQueue
        if (queue.length > 0) {
          this.currentItem = queue[0]
        }
      }
      this.saveState()
    },

    /** 持久化 localStorage */
    saveState() {
      saveUserState(this.userState)
    },

    // ── 管理后台操作 ──

    /**
     * 获取后台列表
     */
    async fetchAdminList() {
      this.loading = true
      try {
        const { list } = await getAllItems({ pageSize: 100 })
        this.items = list
      } catch (e) {
        console.error('拉取管理列表失败:', e)
      } finally {
        this.loading = false
      }
    },

    /** 新建资讯（由编辑器调用） */
    async create(data) {
      return await createItem(data)
    },

    /** 更新资讯 */
    async update(id, data) {
      return await updateItem(id, data)
    },

    /** 获取单条 */
    async fetchOne(id) {
      return await getItem(id)
    },

    /** 删除资讯 */
    async remove(id) {
      await deleteItem(id)
      this.items = this.items.filter(i => (i.objectId || i.id) !== id)
    },

    // ── 调试操作 ──

    /** 重置当天状态（清空已读/收藏/关闭） */
    resetState() {
      this.userState.viewedIds = []
      this.userState.dismissed = false
      this.userState.lastFetchDate = ''
      this.userState.lastShownIndex = 0
      this.browsingHistory = false
      this.saveState()
    },

    /** 强制刷新并重新推送 */
    async forcePush() {
      this.resetState()
      await this.checkAndPush()
    }
  }
})
