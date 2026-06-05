import { createRouter, createWebHashHistory } from 'vue-router'
import { getCurrentUser } from '@/api/user'
import HomeView from '@/views/HomeView.vue'
import DetailView from '@/views/DetailView.vue'
import LoginView from '@/views/LoginView.vue'
import AdminView from '@/views/AdminView.vue'
import FavoritesView from '@/views/FavoritesView.vue'
import CategoryManagerView from '@/views/CategoryManagerView.vue'
import SettingsView from '@/views/SettingsView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/detail/:id', name: 'detail', component: DetailView, meta: { requiresAuth: true } },
  { path: '/favorites', name: 'favorites', component: FavoritesView, meta: { requiresAuth: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { guest: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/categories', name: 'categories', component: CategoryManagerView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：未登录→登录页，非管理员→首页
router.beforeEach((to, from, next) => {
  const user = getCurrentUser()
  const isLoggedIn = !!user
  const isAdmin = user?.role === 'admin' || user?.username === 'admin'

  if (to.meta.requiresAuth && !isLoggedIn) return next('/login')
  if (to.meta.requiresAdmin && !isAdmin) return next('/')
  if (to.meta.guest && isLoggedIn) return next('/')
  next()
})

export default router
