<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-3xl mx-auto px-4 py-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4 m-0">⚙️ 设置</h2>

      <div class="space-y-4">

        <!-- ── 通知设置 ── -->
        <div class="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h3 class="text-sm font-semibold text-gray-700 m-0">📰 通知</h3>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-800 m-0">🧪 显示测试通知</p>
              <p class="text-xs text-gray-400 mt-0.5 m-0">在首页显示「测试」分类按钮（测试通知仅在该分类下可见）</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="showTest" class="sr-only peer" />
              <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
            </label>
          </div>
        </div>

        <!-- ── 每日资讯 ── -->
        <div class="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h3 class="text-sm font-semibold text-gray-700 m-0">📚 每日资讯</h3>

          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-800 m-0">📚 显示每日资讯</p>
              <p class="text-xs text-gray-400 mt-0.5 m-0">在首页右下角展示每日资讯卡片</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="showKnowledge" class="sr-only peer" />
              <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div class="flex items-center justify-between pl-6">
            <div>
              <p class="text-sm font-medium text-gray-800 m-0">📱 移动端显示资讯</p>
              <p class="text-xs text-gray-400 mt-0.5 m-0">在首页通知列表顶部嵌入资讯卡片</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="showKnowledgeMobile" class="sr-only peer" />
              <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>

        <!-- ── AI 模型设置 ── -->
        <div class="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h3 class="text-sm font-semibold text-gray-700 m-0">🤖 AI 模型</h3>
          <p class="text-xs text-gray-400 m-0">用于 AI 生成通知、图片理解等功能</p>

          <!-- 提供商选择 + 描述 -->
          <div>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="p in providerList"
                :key="p.id"
                class="px-3 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors"
                :class="aiConfig.provider === p.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'"
                @click="switchProvider(p.id)"
              >
                {{ p.name }}
              </button>
            </div>
            <p v-if="providerInfo" class="text-xs text-gray-400 mt-1.5 m-0">{{ providerInfo.description }}</p>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-xs text-gray-500 mb-1">API Key</label>
            <div class="flex gap-2">
              <input
                v-model="aiConfig.apiKey"
                :type="showKey ? 'text' : 'password'"
                class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                :placeholder="providerInfo?.envKey ? `留空则使用 .env 中的 ${providerInfo.envKey}` : '必填（自定义提供商无环境变量）'"
              />
              <button
                class="px-2 py-2 text-xs text-gray-400 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer border-none shrink-0"
                @click="showKey = !showKey"
              >{{ showKey ? '🙈' : '👁️' }}</button>
              <button
                class="px-3 py-2 text-xs text-gray-500 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer border-none shrink-0"
                @click="aiConfig.apiKey = ''; saveConfig()"
                :disabled="!aiConfig.apiKey"
              >清除</button>
            </div>
            <p v-if="hasEnvKey" class="text-xs text-green-600 mt-1">✅ 已配置环境变量密钥（{{ providerInfo?.envKey }}）</p>
          </div>

          <!-- 模型选择 -->
          <div>
            <label class="block text-xs text-gray-500 mb-1">模型</label>
            <select
              v-model="aiConfig.model"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              @change="saveConfig"
            >
              <option value="">{{ providerInfo?.defaultModel ? `默认（${providerInfo.defaultModel}）` : '请输入模型名称' }}</option>
              <option v-for="m in modelList" :key="m.id" :value="m.id">{{ m.name }}（{{ m.id }}）</option>
            </select>
            <!-- 自定义模型：允许手动输入 -->
            <input
              v-if="aiConfig.provider === 'custom'"
              v-model="aiConfig.model"
              type="text"
              class="w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="输入模型名称（如 llama3、qwen2.5 等）"
              @change="saveConfig"
            />
          </div>

          <!-- API 端点 -->
          <div>
            <label class="block text-xs text-gray-500 mb-1">
              API 端点
              <span v-if="providerInfo?.defaultEndpoint && aiConfig.provider !== 'custom'" class="text-gray-400 font-normal">（可选，默认 {{ providerInfo.defaultEndpoint }}）</span>
              <span v-else class="text-orange-500 font-normal">（必填）</span>
            </label>
            <input
              v-model="aiConfig.endpoint"
              type="text"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              :placeholder="aiConfig.provider === 'custom' ? 'https://your-api.example.com/v1/chat/completions' : providerInfo?.defaultEndpoint || 'API 端点 URL'"
              @change="saveConfig"
            />
          </div>

          <!-- 能力提示 -->
          <div class="text-xs text-gray-400 bg-gray-50 rounded p-3 space-y-1">
            <p class="m-0">
              <span class="font-medium">{{ providerInfo?.name }}</span>
              <span v-if="providerInfo?.supportsVision" class="text-green-600"> ✅ 支持图片理解</span>
              <span v-else class="text-yellow-600"> ⚠️ 仅文本，不支持图片</span>
            </p>
            <p v-if="aiConfig.apiKey || hasEnvKey" class="m-0 text-green-600">✅ API 已配置，可在后台使用 AI 生成通知</p>
            <p v-else class="m-0 text-orange-500">⚠️ 未配置 API Key，AI 功能不可用</p>
          </div>
        </div>

        <!-- ── 开发者选项 ── -->
        <div class="bg-white rounded-lg shadow-sm border p-6 space-y-4">
          <h3 class="text-sm font-semibold text-gray-700 m-0">🔧 开发者选项</h3>

          <div class="flex items-center justify-between" :class="{ 'opacity-50': !isAdmin }">
            <div>
              <p class="text-sm font-medium text-gray-800 m-0">🧪 调试模式</p>
              <p class="text-xs text-gray-400 mt-0.5 m-0">{{ isAdmin ? '显示 HTML 源码、Mermaid 调试预设等开发者功能' : '仅管理员可开启' }}</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="debugMode" class="sr-only peer" :disabled="!isAdmin" />
              <div class="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 peer-disabled:opacity-40"></div>
            </label>
          </div>

          <!-- 实验室（仅管理员） -->
          <template v-if="isAdmin">
            <hr class="border-gray-200" />
            <div>
              <p class="text-sm font-medium text-gray-800 m-0">🔬 实验室</p>
              <p class="text-xs text-gray-400 mt-0.5 mb-3">功能试验和效果演示</p>
              <div class="flex flex-wrap gap-2">
                <router-link
                  to="/lab/mock-notification"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-lg border border-purple-200 no-underline hover:bg-purple-100 cursor-pointer"
                >📄 模拟通知 · PDF 预览测试</router-link>
                <router-link
                  to="/admin"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-yellow-50 text-yellow-600 rounded-lg border border-yellow-200 no-underline hover:bg-yellow-100 cursor-pointer"
                >🧪 测试数据管理</router-link>
                <a
                  href="/lab/pdf-viewer.html"
                  target="_blank"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-lg border border-purple-200 no-underline hover:bg-purple-100 cursor-pointer"
                >🔧 PDF.js 独立演示</a>
              </div>
            </div>
          </template>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, computed, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { PROVIDERS, getAiConfig, saveAiConfig, getModelList } from '@/api/ai'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

const providerList = Object.values(PROVIDERS)

// ── AI 配置 ──
const aiConfig = reactive(getAiConfig())
const showKey = ref(false)

const providerInfo = computed(() => PROVIDERS[aiConfig.provider])
const modelList = computed(() => getModelList(aiConfig.provider))

/** 当前选择的提供商是否有环境变量配置的密钥 */
const hasEnvKey = computed(() => {
  const info = providerInfo.value
  return info && !!import.meta.env[info.envKey]
})

function switchProvider(id) {
  aiConfig.provider = id
  aiConfig.model = ''
  aiConfig.endpoint = ''
  // 切提供商时不自动清 apiKey（避免误操作）
  // 如果新提供商有 envKey 且 apiKey 为空，从 .env 读
  const info = PROVIDERS[id]
  if (!aiConfig.apiKey && info) {
    aiConfig.apiKey = import.meta.env[info.envKey] || ''
  }
  saveConfig()
}

function saveConfig() {
  saveAiConfig({ ...aiConfig })
}

// ── 调试模式 ──
const debugMode = ref(false)
function initDebugMode() {
  const stored = localStorage.getItem('mermaid-debug') === 'true'
  if (stored && !isAdmin.value) {
    localStorage.removeItem('mermaid-debug')
    debugMode.value = false
  } else if (stored && isAdmin.value) {
    debugMode.value = true
  }
}
initDebugMode()

watch(debugMode, (v) => {
  if (!isAdmin.value) {
    debugMode.value = false
    return
  }
  localStorage.setItem('mermaid-debug', v ? 'true' : 'false')
})

// ── 显示测试通知 ──
const showTest = ref(localStorage.getItem('show-test-notifications') === 'true')
watch(showTest, (v) => {
  localStorage.setItem('show-test-notifications', v ? 'true' : 'false')
})

// ── 每日资讯 ──
const showKnowledge = ref(localStorage.getItem('knowledge:enabled') !== 'false')
watch(showKnowledge, (v) => {
  localStorage.setItem('knowledge:enabled', v ? 'true' : 'false')
})

const showKnowledgeMobile = ref(localStorage.getItem('knowledge:showOnMobile') === 'true')
watch(showKnowledgeMobile, (v) => {
  localStorage.setItem('knowledge:showOnMobile', v ? 'true' : 'false')
})
</script>
