<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-3xl mx-auto px-4 py-6">
      <!-- 加载中 -->
      <div v-if="loading" class="text-center py-20 text-gray-400">
        <div class="text-3xl mb-2">⏳</div>
        <p>加载中...</p>
      </div>

      <!-- 通知详情 -->
      <div v-else-if="notification" class="bg-white rounded-lg shadow-sm border p-6">
        <!-- 返回 + 操作 -->
        <div class="flex items-center justify-between mb-4">
          <button @click="goBack" class="text-sm text-gray-500 hover:text-gray-700 bg-transparent border-none cursor-pointer">
            ← 返回列表
          </button>
          <div class="flex items-center gap-3">
            <button
              class="text-lg bg-transparent border-none cursor-pointer hover:scale-110 transition-transform"
              @click="toggleFavorite"
            >
              {{ isFav ? '⭐' : '☆' }}
            </button>
            <router-link
              v-if="userStore.isAdmin"
              :to="`/admin?edit=${notification.id}`"
              class="text-sm text-blue-500 no-underline"
            >
              编辑
            </router-link>
          </div>
        </div>

        <!-- 分类 + 优先级 -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-sm px-2 py-0.5 rounded bg-gray-100 text-gray-600">
            {{ typeIcon }} {{ typeName }}
          </span>
          <span
            v-if="notification.priority > 0"
            class="text-sm px-2 py-0.5 rounded-full"
            :class="priorityBadgeClass"
          >
            {{ priorityLabel }}
          </span>
        </div>

        <!-- 标题 -->
        <h1 class="text-2xl font-bold text-gray-900 mb-3 m-0">{{ notification.title }}</h1>

        <!-- 元信息 -->
        <div class="flex items-center gap-2 text-sm text-gray-400 mb-6 flex-wrap">
          <span v-if="notification.sourcePerson">{{ notification.sourcePerson }}</span>
          <span v-if="notification.sourcePerson && notification.sourceGroup">·</span>
          <span v-if="notification.sourceGroup">{{ notification.sourceGroup }}</span>
          <span v-if="notification.sourcePerson || notification.sourceGroup">·</span>
          <span>{{ formatDate(notification.createdAt) }}</span>
          <template v-if="notification.originalLink">
            <span>·</span>
            <a :href="notification.originalLink" target="_blank" class="text-blue-500 no-underline hover:underline">查看原文</a>
          </template>
        </div>

        <!-- 标签 -->
        <div v-if="notification.tags && notification.tags.length" class="flex gap-1 mb-6 flex-wrap">
          <span v-for="tag in notification.tags" :key="tag" class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
            #{{ tag }}
          </span>
        </div>

        <!-- 分割线 -->
        <hr class="border-gray-200 mb-6" />

        <!-- 调试：HTML 源码切换 -->
        <button
          v-if="debugMode"
          type="button"
          class="mb-2 text-xs text-gray-400 hover:text-gray-600 bg-transparent border border-gray-200 rounded px-2 py-0.5 cursor-pointer"
          @click="showSource = !showSource"
        >
          {{ showSource ? '👁️ 预览' : '🔧 查看 HTML 源码' }}
        </button>

        <!-- 正文内容（HTML 渲染 / 源码） -->
        <div v-show="!showSource" ref="contentRef" class="prose prose-sm max-w-none text-gray-800 leading-relaxed [&_img]:cursor-pointer [&_img]:hover:opacity-90 [&_img]:transition-opacity [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800" v-html="safeContent"></div>
        <pre v-show="showSource" class="w-full p-4 bg-gray-50 border border-gray-200 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">{{ safeContent }}</pre>

        <!-- 图片放大 -->
        <Lightbox :visible="lightbox.show" :src="lightbox.src" :alt="lightbox.alt" @close="lightbox.show = false" />
        <!-- PDF 预览 -->
        <PdfPreview :visible="pdfPreview.show" :url="pdfPreview.url" :filename="pdfPreview.filename" @close="pdfPreview.show = false" />
      </div>

      <!-- 未找到 -->
      <div v-else class="text-center py-20 text-gray-400">
        <div class="text-4xl mb-3">🔍</div>
        <p>通知不存在或已删除</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getNotification } from '@/api/notification'
import { PRIORITY_LABEL } from '@/utils/constants'
import Lightbox from '@/components/Lightbox.vue'
import PdfPreview from '@/components/PdfPreview.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const notification = ref(null)
const loading = ref(true)
const isFav = ref(false)
const contentRef = ref(null)
const lightbox = ref({ show: false, src: '', alt: '' })
const pdfPreview = ref({ show: false, url: '', filename: '' })
const debugMode = ref(localStorage.getItem('mermaid-debug') === 'true')
const showSource = ref(false)

const priorityLabel = computed(() => PRIORITY_LABEL[notification.value?.priority]?.label || '')
const priorityBadgeClass = computed(() => {
  const map = { 1: 'bg-yellow-100 text-yellow-700', 2: 'bg-red-100 text-red-700', 3: 'bg-orange-100 text-orange-700' }
  return map[notification.value?.priority] || ''
})

const typeIcon = computed(() => {
  const map = { zongce: '📊', baoyan: '🎓', course: '📚', activity: '🎉', homework: '📝', other: '📌' }
  return map[notification.value?.type] || '📌'
})

const typeName = computed(() => {
  // 从 notification 的 type 字段找，暂时 fallback
  return notification.value?.type || '其他'
})

const safeContent = computed(() => {
  return notification.value?.content || '<p style="color:#999">暂无内容</p>'
})

onMounted(async () => {
  const id = route.params.id
  if (id) {
    try {
      notification.value = await getNotification(id)
    } catch (e) {
      console.error('加载详情失败:', e)
    }
  }
  loading.value = false
})

// 内容加载后，给图片绑定点击放大
watch([contentRef, notification], async () => {
  if (!contentRef.value) return
  await nextTick()
  // 渲染 Mermaid 流程图
  const mermaids = contentRef.value?.querySelectorAll('[data-mermaid]')
  if (mermaids?.length) {
    import('mermaid').then(mod => {
      const mermaid = mod.default || mod
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
      mermaids.forEach(async (el) => {
        const raw = el.getAttribute('data-mermaid') || ''
        const code = raw.replace(/^```(?:mermaid)?\s*/gm, '').replace(/```\s*$/gm, '').trim()
        if (!code) return
        try {
          const id = `dm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const { svg } = await mermaid.render(id, code)
          el.innerHTML = svg
          el.classList.add('mermaid-rendered')
          const svgEl = el.querySelector('svg')
          if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto' }
        } catch (e) {
          const snippet = code.slice(0, 120)
          el.innerHTML = `<div class="text-xs text-red-500 p-3 bg-red-50 rounded border border-red-200">
            <p class="font-bold mb-1">⚠️ 流程图渲染失败</p>
            <p class="mb-1">${e.message || ''}</p>
            <pre class="text-gray-600 whitespace-pre-wrap mt-1 bg-white p-2 rounded border">${snippet.replace(/</g, '&lt;')}</pre>
          </div>`
        }
      })
    }).catch(() => {})
  }

  const imgs = contentRef.value.querySelectorAll('img')
  imgs.forEach(img => {
    img.addEventListener('click', (e) => {
      e.stopPropagation()
      lightbox.value = { show: true, src: img.src, alt: img.alt || '' }
    })
  })
  // PDF 链接点击预览
  const pdfLinks = contentRef.value.querySelectorAll('a[href$=".pdf"]')
  pdfLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const urlParts = a.href.split('/')
      const filename = decodeURIComponent(urlParts[urlParts.length - 1]) || 'document.pdf'
      pdfPreview.value = { show: true, url: a.href, filename }
    })
  })
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function goBack() {
  router.back()
}

function toggleFavorite() {
  isFav.value = !isFav.value
}
</script>
