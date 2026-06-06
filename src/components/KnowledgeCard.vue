<template>
  <div>
    <!-- 折叠态：? 按钮 -->
    <button
      v-if="collapsed"
      class="fixed bottom-6 left-6 z-40 w-8 h-8 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-sm font-bold cursor-pointer border-none hover:bg-blue-600 transition-colors"
      title="查看每日资讯"
      @click="expand"
    >
      ?
    </button>

    <!-- 展开态：浮动卡片 -->
    <Transition name="knowledge-slide">
      <div
        v-if="!collapsed && store.currentItem"
        class="fixed bottom-6 left-6 z-40 bg-white rounded-xl shadow-xl border w-80 max-h-[300px] flex flex-col overflow-hidden"
        :class="cardBorderClass"
      >
        <!-- 测试横幅 -->
        <div
          v-if="isTestItem"
          class="bg-yellow-400 text-[11px] font-bold text-yellow-900 text-center py-1 tracking-wider"
        >🧪 测试数据 · 非真实通知</div>
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 pt-3 pb-1">
          <div class="flex items-center gap-1.5">
            <span class="text-sm">📚</span>
            <span class="text-xs font-semibold text-gray-700">每日资讯</span>
            <span
              v-if="store.browsingHistory"
              class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded"
            >回看</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="debugMode"
              class="text-[10px] text-gray-300 hover:text-green-400 bg-transparent border-none cursor-pointer transition-colors"
              title="调试面板"
              @click.stop="showDebug = !showDebug"
            >🐞</button>
            <button
              v-if="!isPriority2"
              class="text-gray-300 hover:text-gray-500 bg-transparent border-none cursor-pointer text-sm leading-none p-0.5 transition-colors"
              title="关闭（今天不再显示）"
              @click="handleDismiss"
            >✕</button>
            <span v-else class="text-[10px] text-yellow-500 bg-yellow-50 px-1.5 py-0.5 rounded">必读</span>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="flex-1 px-4 py-1 overflow-y-auto text-sm text-gray-700 leading-relaxed [&_a]:text-blue-500 [&_a]:underline" v-html="renderJumpLinks(store.currentItem.content)">
        </div>

        <!-- 底部信息 -->
        <div class="px-4 pb-1 text-[10px] text-gray-400 flex items-center gap-2">
          <span>📎 {{ store.currentItem.source || '精选' }}</span>
          <span v-if="store.currentItem.category" class="text-gray-300">·</span>
          <span v-if="store.currentItem.category">{{ categoryLabel }}</span>
        </div>

        <!-- 操作栏 -->
        <div class="flex items-center justify-between px-4 py-2 border-t border-gray-50">
          <div class="flex gap-2">
            <button
              class="text-xs px-2 py-1 rounded transition-colors cursor-pointer border-none"
              :class="isFav ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'"
              @click="handleToggleFav"
            >
              {{ isFav ? '❤️' : '🤍' }} 收藏
            </button>
          </div>
          <div class="flex gap-1">
            <button
              class="text-xs px-2 py-1 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="!store.hasPrevious"
              @click="store.showPrevious()"
            >← 上条</button>
            <button
              v-if="!store.browsingHistory"
              class="text-xs px-2 py-1 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="!store.hasNext"
              @click="handleNext"
            >下条 →</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 全部已读提示 -->
    <Transition name="knowledge-fade">
      <div
        v-if="showAllRead"
        class="fixed bottom-6 left-6 z-40 bg-white rounded-xl shadow-lg border px-5 py-4 text-center text-sm text-gray-500"
      >
        🎉 今日资讯已全部阅读
      </div>
    </Transition>

    <!-- 调试模式：状态浮层 -->
    <div
      v-if="debugMode && showDebug"
      class="fixed bottom-6 left-6 z-50 bg-gray-900 text-green-300 rounded-xl shadow-2xl border border-gray-700 w-96 max-h-[70vh] flex flex-col overflow-hidden"
    >
      <div class="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span class="text-xs font-mono font-semibold">🧪 知识调试</span>
        <button class="text-gray-400 hover:text-white bg-transparent border-none cursor-pointer text-sm" @click="showDebug = false">✕</button>
      </div>
      <div class="flex-1 overflow-y-auto p-3 text-[11px] font-mono leading-relaxed space-y-2">
        <div>
          <span class="text-gray-400">📅 today:</span> {{ store.today || '(未设置)' }}
        </div>
        <div>
          <span class="text-gray-400">📦 items:</span> {{ store.items.length }}
          <span v-if="store.currentItem" class="text-gray-500">| 当前ID: {{ store.currentItem.objectId || store.currentItem.id }}</span>
        </div>
        <div>
          <span class="text-gray-400">⏳ loading:</span> {{ store.loading }}
          <span class="text-gray-500">|</span>
          <span class="text-gray-400">🔁 browsingHistory:</span> {{ store.browsingHistory }}
        </div>
        <div>
          <span class="text-gray-400">📋 未读:</span> {{ store.unreadQueue.length }} / {{ store.items.length }}
          <span class="text-gray-500">|</span>
          <span class="text-gray-400">✅ allRead:</span> {{ store.allRead }}
        </div>
        <div>
          <span class="text-gray-400">👁️ viewedIds:</span>
          <span v-if="store.userState.viewedIds.length === 0" class="text-gray-600">(空)</span>
          <span v-else class="break-all">{{ store.userState.viewedIds.join(', ') }}</span>
        </div>
        <div>
          <span class="text-gray-400">❤️ favorites:</span>
          <span v-if="store.userState.favoriteIds.length === 0" class="text-gray-600">(空)</span>
          <span v-else class="break-all">{{ store.userState.favoriteIds.join(', ') }}</span>
        </div>
        <div>
          <span class="text-gray-400">📅 lastFetchDate:</span> {{ store.userState.lastFetchDate || '(未设置)' }}
          <span v-if="store.userState.lastFetchDate !== store.today" class="text-yellow-400">(≠ today，下次会重置)</span>
        </div>
        <div>
          <span class="text-gray-400">🚪 dismissed:</span> {{ store.userState.dismissed }}
          <span v-if="store.userState.dismissed" class="text-yellow-400">(卡片已关闭)</span>
        </div>
        <div v-if="store.currentItem" class="border-t border-gray-700 pt-2">
          <details>
            <summary class="text-gray-400 cursor-pointer hover:text-white">🔍 当前资讯 JSON</summary>
            <pre class="mt-1 text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(store.currentItem, null, 2) }}</pre>
          </details>
        </div>
        <div class="border-t border-gray-700 pt-2">
          <details>
            <summary class="text-gray-400 cursor-pointer hover:text-white">📄 localStorage 原始值</summary>
            <pre class="mt-1 text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap">{{ localStorageRaw }}</pre>
          </details>
        </div>
      </div>
      <div class="flex gap-1 p-2 bg-gray-800 border-t border-gray-700">
        <button class="flex-1 px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-500 cursor-pointer border-none" @click="handleResetState">
          🔄 重置状态
        </button>
        <button class="flex-1 px-2 py-1 text-[10px] bg-green-600 text-white rounded hover:bg-green-500 cursor-pointer border-none" @click="handleForcePush">
          📤 强制推送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { renderJumpLinks } from '@/utils/jump-link'
import { CATEGORY_COLORS, KNOWLEDGE_CATEGORIES } from '@/types/knowledge'

const store = useKnowledgeStore()

/** 卡片折叠态 */
const collapsed = ref(true)
/** 显示"全部已读"提示 */
const showAllRead = ref(false)
/** 自动标记已读的定时器 */
let viewTimer = null

/** 调试模式 */
const debugMode = ref(false)
const showDebug = ref(false)
const localStorageRaw = ref('')

/** 当前资讯是否必读级别 */
const isPriority2 = computed(() => store.currentItem?.priority === 2)

/** 是否为测试数据 */
const isTestItem = computed(() => {
  return store.currentItem?.tags?.includes('测试数据')
})

/** 卡片边框样式 */
const cardBorderClass = computed(() => {
  if (isTestItem.value) return 'border-yellow-400 ring-2 ring-yellow-300'
  if (isPriority2.value) return 'border-yellow-300 ring-2 ring-yellow-200'
  return 'border-gray-100'
})

/** 当前是否已收藏 */
const isFav = computed(() => {
  const id = store.currentItem?.objectId || store.currentItem?.id
  return id ? store.userState.favoriteIds.includes(id) : false
})

/** 分类显示名称 */
const categoryLabel = computed(() => {
  const cat = KNOWLEDGE_CATEGORIES.find(c => c.value === store.currentItem?.category)
  return cat ? cat.label.replace(/^.\s*/, '') : store.currentItem?.category || ''
})

/** 读取调试模式 */
function checkDebugMode() {
  debugMode.value = localStorage.getItem('mermaid-debug') === 'true'
}

/** 展开卡片 */
function expand() {
  collapsed.value = false
  store.restoreCard()
}

/** 处理关闭 */
function handleDismiss() {
  store.dismissToday()
  collapsed.value = true
}

/** 处理下一项 */
function handleNext() {
  // 标记当前为已读后 store 会自动推进到下一条
  const currentId = store.currentItem?.objectId || store.currentItem?.id
  if (currentId && !store.browsingHistory) {
    store.markViewed(currentId)
  }
}

/** 切换收藏 */
function handleToggleFav() {
  const id = store.currentItem?.objectId || store.currentItem?.id
  if (id) store.toggleFavorite(id)
}

/** 启动 3 秒已读计时器 */
function startViewTimer() {
  clearTimeout(viewTimer)
  viewTimer = setTimeout(() => {
    const id = store.currentItem?.objectId || store.currentItem?.id
    if (id && !store.browsingHistory) {
      store.markViewed(id)
    }
    // 检查是否全部读了
    if (store.allRead) {
      showAllRead.value = true
      collapsed.value = true
      setTimeout(() => { showAllRead.value = false }, 3000)
    }
  }, 3000)
}

/** 当 currentItem 变化时，重置计时器 */
watch(() => store.currentItem, (newItem) => {
  if (newItem && !store.browsingHistory && !collapsed.value) {
    startViewTimer()
  }
})

/** 暴露给 HomeView 调用的方法 */
function trigger() {
  collapsed.value = false
  store.checkAndPush()
}

defineExpose({ trigger, expand })

// ── 调试操作 ──
onMounted(() => {
  checkDebugMode()
  // 监听 localStorage 变化（调试模式切换）
  window.addEventListener('storage', checkDebugMode)
})

onUnmounted(() => {
  clearTimeout(viewTimer)
  window.removeEventListener('storage', checkDebugMode)
})

function refreshLocalStorageRaw() {
  localStorageRaw.value = localStorage.getItem('knowledge:state') || '(空)'
  try {
    const parsed = JSON.parse(localStorageRaw.value)
    localStorageRaw.value = JSON.stringify(parsed, null, 2)
  } catch { /* 保持原样 */ }
}

function handleResetState() {
  store.resetState()
  refreshLocalStorageRaw()
}

async function handleForcePush() {
  await store.forcePush()
  refreshLocalStorageRaw()
}

// 调试面板打开时刷新
watch(showDebug, (v) => {
  if (v) refreshLocalStorageRaw()
})
</script>

<style scoped>
/* 滑入/滑出动画 */
.knowledge-slide-enter-active {
  transition: all 0.3s ease-out;
}
.knowledge-slide-leave-active {
  transition: all 0.25s ease-in;
}
.knowledge-slide-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.95);
}
.knowledge-slide-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.95);
}

/* 淡入淡出 */
.knowledge-fade-enter-active,
.knowledge-fade-leave-active {
  transition: opacity 0.5s;
}
.knowledge-fade-enter-from,
.knowledge-fade-leave-to {
  opacity: 0;
}
</style>
