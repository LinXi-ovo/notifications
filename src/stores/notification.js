import { defineStore } from 'pinia'
import { getNotifications, getNotification } from '@/api/notification'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    list: [],
    total: 0,
    currentPage: 1,
    pageSize: 20,
    currentType: null,
    searchQuery: '',
    loading: false,
    detail: null
  }),

  actions: {
    async fetchList({ type, search, page } = {}) {
      this.loading = true
      try {
        if (type !== undefined) this.currentType = type
        if (search !== undefined) this.searchQuery = search
        if (page !== undefined) this.currentPage = page

        const result = await getNotifications({
          type: this.currentType,
          search: this.searchQuery || undefined,
          page: this.currentPage,
          pageSize: this.pageSize
        })

        this.list = result.data
        this.total = result.total
      } catch (e) {
        console.error('获取通知列表失败:', e)
        this.list = []
      } finally {
        this.loading = false
      }
    },

    async fetchDetail(id) {
      this.detail = null
      try {
        this.detail = await getNotification(id)
      } catch (e) {
        console.error('获取通知详情失败:', e)
      }
    },

    setType(type) {
      this.currentType = type
      this.currentPage = 1
      this.fetchList()
    },

    setSearch(query) {
      this.searchQuery = query
      this.currentPage = 1
      this.fetchList()
    },

    setPage(page) {
      this.currentPage = page
      this.fetchList()
    }
  }
})
