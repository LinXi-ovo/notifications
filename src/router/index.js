import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import DetailView from '@/views/DetailView.vue'
import LoginView from '@/views/LoginView.vue'
import AdminView from '@/views/AdminView.vue'
import FavoritesView from '@/views/FavoritesView.vue'
import CategoryManagerView from '@/views/CategoryManagerView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/detail/:id', name: 'detail', component: DetailView },
  { path: '/favorites', name: 'favorites', component: FavoritesView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/admin', name: 'admin', component: AdminView },
  { path: '/admin/categories', name: 'categories', component: CategoryManagerView },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：TODO - Phase 3 实现完整的 auth 检查
// router.beforeEach((to, from, next) => {
//   const user = getCurrentUser()
//   if (to.meta.requiresAuth && !user) return next('/login')
//   if (to.meta.requiresAdmin && !isAdmin(user)) return next('/')
//   if (to.meta.guest && user) return next('/')
//   next()
// })

export default router
