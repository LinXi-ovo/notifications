import { defineStore } from 'pinia'
import { getCurrentUser, login, logout, register } from '@/api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: getCurrentUser()
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin' || state.user?.username === 'admin',
    isSuperAdmin: (state) => state.user?.username === 'admin',
    username: (state) => state.user?.username || ''
  },

  actions: {
    async login(username, password) {
      const user = await login(username, password)
      this.user = user
      return user
    },

    async register(params) {
      const user = await register(params)
      this.user = user
      return user
    },

    logout() {
      logout()
      this.user = null
    },

    refresh() {
      this.user = getCurrentUser()
    }
  }
})
