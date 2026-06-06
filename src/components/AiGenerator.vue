<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="close">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-bold text-gray-800 m-0">🤖 AI 生成通知</h3>
          <button
            v-if="debugMode"
            class="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-600 hover:bg-yellow-200 border-none cursor-pointer"
            @click="showPromptEditor = !showPromptEditor"
          >🧪 提示词</button>
        </div>
        <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl" @click="close">✕</button>
      </div>

      <!-- 内容 -->
      <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1">
        <!-- Tab 切换 -->
        <div class="flex border-b border-gray-200 -mx-6 px-6">
          <button
            class="px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer bg-transparent transition-colors"
            :class="activeTab === 'text' ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'"
            @click="activeTab = 'text'"
          >📝 文本</button>
          <button
            class="px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer bg-transparent transition-colors"
            :class="activeTab === 'image' ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'"
            @click="activeTab = 'image'"
          >🖼️ 图片</button>
          <button
            class="px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer bg-transparent transition-colors"
            :class="activeTab === 'ocr' ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'"
            @click="activeTab = 'ocr'"
          >📷 OCR</button>
        </div>

        <!-- ════════ Tab: 文本 ════════ -->
        <template v-if="activeTab === 'text'">
          <div>
            <label class="block text-sm text-gray-600 mb-1">粘贴原始内容</label>
            <textarea
              v-model="rawInput"
              class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows="8"
              placeholder="例如：&#10;各位同学好，&#10;2025-2026学年综合素质测评工作现已启动...&#10;来源：年级群 · 辅导员李老师"
            ></textarea>
          </div>

          <div v-if="categories.length" class="text-xs text-gray-400">
            可识别的分类：{{ categories.map(c => c.icon + c.name).join('、') }}
          </div>

          <!-- 同时生成任务 -->
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="withMission" class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400" />
            <span class="text-sm text-gray-600">📋 同时生成配套任务（DAG）</span>
          </label>

          <!-- 提供商/模型信息 -->
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span>🤖 {{ providerName }}</span>
            <span>·</span>
            <span>模型: {{ currentModel }}</span>
            <span v-if="!apiReady" class="text-orange-500">⚠️ API 未配置</span>
          </div>
        </template>

        <!-- ════════ Tab: 图片 ════════ -->
        <template v-if="activeTab === 'image'">
          <div
            class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            :class="dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <div v-if="!imagePreview" class="space-y-2">
              <div class="text-4xl">🖼️</div>
              <p class="text-sm text-gray-500 m-0">拖拽图片到此处，或点击上传</p>
              <p class="text-xs text-gray-400 m-0">支持截图粘贴（Ctrl+V）、PNG/JPG/WebP</p>
            </div>
            <div v-else class="space-y-2">
              <img :src="imagePreview" class="max-h-64 mx-auto rounded shadow-sm" />
              <p class="text-xs text-gray-400 m-0">点击重新选择 / 拖拽替换</p>
            </div>
          </div>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="handleFileSelect" />

          <!-- 图片已上传 -->
          <div v-if="uploadedImageUrl" class="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded px-3 py-2">
            ✅ 图片已上传
            <a :href="uploadedImageUrl" target="_blank" class="text-blue-500 ml-1">查看</a>
          </div>

          <div v-if="!imageVisionSupported" class="text-xs text-yellow-600 bg-yellow-50 rounded p-3">
            ⚠️ 当前 AI 提供商（{{ providerName }}）不支持图片理解。
            <button class="text-blue-500 underline bg-transparent border-none cursor-pointer" @click="switchToOpenAI">切换到 OpenAI</button>
          </div>

          <div v-if="imageExtractedText" class="space-y-2">
            <label class="text-xs text-gray-500">图片提取的文字</label>
            <textarea
              v-model="imageExtractedText"
              class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows="6"
            ></textarea>
            <p class="text-xs text-gray-400">可编辑修整后，点击「🚀 生成通知」从提取的文本生成</p>
          </div>
        </template>

        <!-- ════════ Tab: OCR ════════ -->
        <template v-if="activeTab === 'ocr'">
          <div>
            <label class="block text-sm text-gray-600 mb-1">把豆包生成的文本粘贴到这里</label>
            <textarea
              v-model="ocrRaw"
              class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows="8"
              placeholder="从豆包复制输出粘贴到这里...&#10;&#10;会自动识别第一行为标题"
              @input="extractTitleFromOcr"
            ></textarea>
          </div>
          <div v-if="ocrTitle" class="flex items-center gap-2 text-sm bg-blue-50 rounded px-3 py-2 border border-blue-100">
            <span class="text-xs text-blue-500 shrink-0">自动提取标题</span>
            <span class="text-blue-700">{{ ocrTitle }}</span>
          </div>
        </template>

        <!-- ════════ 生成结果预览 ════════ -->
        <div v-if="result" class="space-y-3 bg-gray-50 rounded-lg p-4 border">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="text-xs text-gray-500">标题</label><p class="text-sm font-medium text-gray-800">{{ result.title }}</p></div>
            <div><label class="text-xs text-gray-500">分类</label><p class="text-sm">{{ result.type ? (typeLabel(result.type) || result.type) : '未识别' }}</p></div>
            <div><label class="text-xs text-gray-500">来源群组</label><p class="text-sm text-gray-600">{{ result.sourceGroup || '—' }}</p></div>
            <div><label class="text-xs text-gray-500">发布人</label><p class="text-sm text-gray-600">{{ result.sourcePerson || '—' }}</p></div>
            <div><label class="text-xs text-gray-500">优先级</label><p class="text-sm">{{ result.priority > 0 ? priorityLabel(result.priority) : '普通' }}</p></div>
            <div><label class="text-xs text-gray-500">标签</label><p class="text-sm text-gray-600">{{ result.tags?.length ? result.tags.join(', ') : '—' }}</p></div>
          </div>
          <div>
            <label class="text-xs text-gray-500">正文内容</label>
            <div class="text-sm text-gray-700 mt-1 p-3 bg-white rounded border" v-html="result.content"></div>
          </div>
          <div v-if="result.originalLink" class="text-xs text-blue-500">🔗 {{ result.originalLink }}</div>
        </div>

        <!-- 📋 配套任务预览 -->
        <div v-if="result?._missionData" class="space-y-2 bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-indigo-700">📋 配套任务</span>
            <span class="text-xs text-indigo-400">（将随通知一起创建）</span>
          </div>
          <p class="text-sm font-medium text-indigo-800 m-0">{{ result._missionData.title }}</p>
          <p v-if="result._missionData.description" class="text-xs text-indigo-600 m-0">{{ result._missionData.description }}</p>
          <div class="flex flex-wrap gap-1">
            <span v-for="r in result._missionData.roles" :key="r.id" class="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{{ r.emoji }} {{ r.name }}</span>
          </div>
          <div class="text-xs text-indigo-500">
            {{ result._missionData.nodes?.length || 0 }} 个节点 ·
            {{ result._missionData.edges?.length || 0 }} 条依赖
          </div>
        </div>

        <!-- 错误 -->
        <div v-if="error" class="text-sm text-red-500 bg-red-50 rounded p-3">{{ error }}</div>

        <!-- 🧪 调试模式：提示词编辑器 -->
        <div v-if="showPromptEditor" class="space-y-3 bg-gray-50 rounded-lg p-4 border border-yellow-200">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-yellow-700">🧪 提示词编辑器</span>
            <button class="text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer" @click="showPromptEditor = false">✕ 关闭</button>
          </div>
          <div v-for="(prompt, key) in editablePrompts" :key="key" class="space-y-1">
            <label class="text-xs text-gray-500">{{ promptLabel(key) }}</label>
            <textarea
              v-model="editablePrompts[key]"
              class="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400 resize-none"
              rows="6"
            ></textarea>
          </div>
          <div class="flex gap-2">
            <button class="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 cursor-pointer border-none" @click="savePrompts">💾 保存</button>
            <button class="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 cursor-pointer border-none" @click="resetPrompts">↩ 重置默认</button>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <span class="text-xs text-gray-400">{{ result ? '✅ 已生成，可点击"填入表单"' : '' }}</span>
        <div class="flex gap-2">
          <button class="px-4 py-2 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer" @click="close">取消</button>

          <!-- OCR tab: 填入编辑器 -->
          <button
            v-if="activeTab === 'ocr'"
            class="px-4 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer border-none disabled:opacity-50"
            :disabled="!ocrRaw.trim()"
            @click="applyOcr"
          >📥 填入编辑器</button>

          <!-- 图片 tab: 先提取文字，再生成 -->
          <template v-else-if="activeTab === 'image'">
            <button
              v-if="uploadedImageUrl && !imageExtractedText"
              class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer border-none disabled:opacity-50"
              :disabled="!apiReady || processingImage"
              @click="extractImageText"
            >{{ processingImage ? '⏳ 提取中...' : '🔍 提取图片文字' }}</button>
            <button
              v-if="imageExtractedText"
              class="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer border-none disabled:opacity-50"
              :disabled="!apiReady || generating"
              @click="generateFromExtractedText"
            >{{ generating ? '⏳ 生成中...' : '🚀 生成通知' }}</button>
          </template>

          <!-- 文本 tab: AI 生成 -->
          <template v-else>
            <button
              v-if="result"
              class="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer border-none"
              @click="apply"
            >📋 填入表单</button>
            <button
              v-else
              class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer border-none disabled:opacity-50"
              :disabled="!apiReady || generating || !rawInput.trim()"
              @click="generateFromText"
            >{{ generating ? '⏳ 生成中...' : '🚀 AI 生成' }}</button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { PROVIDERS, getAiConfig, generateNotification, understandImage } from '@/api/ai'
import { uploadFile } from '@/api/cos'

const props = defineProps({
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'apply'])

// ── AI 配置 ──
const aiCfg = ref(getAiConfig())
const providerName = computed(() => {
  const p = PROVIDERS[aiCfg.value.provider]
  return p?.name || aiCfg.value.provider
})
const currentModel = computed(() => {
  return aiCfg.value.model || PROVIDERS[aiCfg.value.provider]?.defaultModel || '默认'
})
const apiReady = computed(() => !!aiCfg.value.apiKey)
const imageVisionSupported = computed(() => PROVIDERS[aiCfg.value.provider]?.supportsVision)

const activeTab = ref('text')

const rawInput = ref('')
const generating = ref(false)
const error = ref('')
const result = ref(null)

// ── 图片 ──
const fileInput = ref(null)
const dragOver = ref(false)
const imagePreview = ref('')
const uploadedImageUrl = ref('')
const processingImage = ref(false)
const imageExtractedText = ref('')

function triggerFileInput() { fileInput.value?.click() }

function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) handleImageFile(file)
}

function handleDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    handleImageFile(file)
  }
}

async function handleImageFile(file) {
  // 本地预览
  const reader = new FileReader()
  reader.onload = (e) => { imagePreview.value = e.target.result }
  reader.readAsDataURL(file)

  // 上传 COS
  try {
    uploadedImageUrl.value = await uploadFile(file)
    imageExtractedText.value = ''
  } catch (e) {
    error.value = '图片上传失败: ' + (e.message || e)
  }
}

/** 切换到 OpenAI */
async function switchToOpenAI() {
  aiCfg.value.provider = 'openai'
  aiCfg.value.model = ''
  const { VITE_OPENAI_API_KEY } = import.meta.env
  if (VITE_OPENAI_API_KEY && !aiCfg.value.apiKey) {
    aiCfg.value.apiKey = VITE_OPENAI_API_KEY
  }
  // 保存到 localStorage
  const mod = await import('@/api/ai')
  mod.saveAiConfig({ ...aiCfg.value })
}

// ── 任务生成 ──
const withMission = ref(false)

// ── 调试模式：提示词编辑器 ──
const debugMode = computed(() => localStorage.getItem('mermaid-debug') === 'true')
const showPromptEditor = ref(false)
const editablePrompts = ref({})
let aiModule = null

function promptLabel(key) {
  const labels = { notification: '📰 通知生成提示词', mission: '📋 任务生成提示词', image: '🖼️ 图片理解提示词' }
  return labels[key] || key
}

function loadPrompts() {
  if (!aiModule) return
  editablePrompts.value = { ...aiModule.getAllPrompts() }
}

function savePrompts() {
  if (!aiModule) return
  for (const [key, value] of Object.entries(editablePrompts.value)) {
    aiModule.setPrompt(key, value)
  }
  alert('✅ 提示词已保存')
}

function resetPrompts() {
  if (!confirm('确定重置所有提示词到默认值？')) return
  if (!aiModule) return
  aiModule.resetAllPrompts()
  editablePrompts.value = { ...aiModule.DEFAULT_PROMPTS }
  alert('✅ 已重置为默认提示词')
}

/** 提取图片文字 */
async function extractImageText() {
  if (!uploadedImageUrl.value) return
  processingImage.value = true
  error.value = ''
  try {
    const text = await understandImage(uploadedImageUrl.value, '保留原文格式，不要概括', aiCfg.value)
    imageExtractedText.value = text
  } catch (e) {
    error.value = '图片文字提取失败: ' + (e.message || e)
  } finally {
    processingImage.value = false
  }
}

/** 从提取的图片文字生成通知 */
async function generateFromExtractedText() {
  rawInput.value = imageExtractedText.value
  await generateFromText()
}

// ── 文本生成 ──
async function generateFromText() {
  if (!rawInput.value.trim() || generating.value) return
  if (!apiReady.value) {
    error.value = '未配置 API Key，请在设置页配置 AI 模型'
    return
  }

  generating.value = true
  error.value = ''
  result.value = null

  try {
    const opts = { ...aiCfg.value, withMission: withMission.value }
    const res = await generateNotification(rawInput.value, props.categories, opts)
    result.value = res
  } catch (e) {
    error.value = '生成失败: ' + (e.message || e)
  } finally {
    generating.value = false
  }
}

// ── OCR ──
const ocrRaw = ref('')
const ocrTitle = ref('')

function extractTitleFromOcr() {
  const text = ocrRaw.value.trim()
  if (!text) { ocrTitle.value = ''; return }
  const firstLine = text.split('\n').find(l => l.trim().length > 0)
  ocrTitle.value = firstLine ? firstLine.replace(/^[\s📢📣⭐🔴🚨⚠️✅📋📌📍🎯🎉💡]+/, '').trim() : ''
}

function applyOcr() {
  const text = ocrRaw.value.trim()
  if (!text) return
  const lines = text.split('\n')
  const title = ocrTitle.value

  let sourceGroup = ''
  let sourcePerson = ''
  let deadline = ''
  const bodyLines = lines.slice(1).filter(l => {
    const line = l.trim()
    if (/^来源[：:]\s*/.test(line)) { sourceGroup = line.replace(/^来源[：:]\s*/, ''); return false }
    if (/^发布人[：:]\s*/.test(line)) { sourcePerson = line.replace(/^发布人[：:]\s*/, ''); return false }
    if (/^截止日期[：:]\s*/.test(line)) { deadline = parseDeadline(line.replace(/^截止日期[：:]\s*/, '')); return false }
    return true
  }).join('\n').trim()

  emit('apply', {
    title,
    content: textToHtml(bodyLines || text),
    deadline,
    type: '',
    sourceGroup,
    sourcePerson,
    priority: 0,
    tags: [],
    originalLink: ''
  })
  close()
}

// ── 辅助 ──
const catMap = computed(() => {
  const map = {}
  props.categories.forEach(c => { map[c.value] = c })
  return map
})

function typeLabel(value) {
  const c = catMap.value[value]
  return c ? `${c.icon} ${c.name}` : value
}

function priorityLabel(p) {
  const map = { 1: '⭐ 置顶', 2: '🔴 重要', 3: '🚨 紧急' }
  return map[p] || ''
}

function parseDeadline(str) {
  const match1 = str.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)
  if (match1) { const d = new Date(+match1[1], +match1[2] - 1, +match1[3]); return d.toISOString().slice(0, 10) }
  const match2 = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match2) return str
  const match3 = str.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/)
  if (match3) { const d = new Date(new Date().getFullYear(), +match3[1] - 1, +match3[2]); return d.toISOString().slice(0, 10) }
  return str
}

function textToHtml(text) {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean)
  if (paragraphs.length === 0) return `<p>${escapeHtml(text)}</p>`
  return paragraphs.map(p => `<p>${escapeHtml(p.trim())}</p>`).join('\n')
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}

function apply() {
  if (result.value) {
    const data = { ...result.value }
    const missionData = data._missionData
    delete data._mermaidMap
    delete data._missionData
    emit('apply', {
      ...data,
      mermaidMap: result.value._mermaidMap || {},
      // 如果有配套任务数据，一并传递
      ...(missionData ? { _missionData: missionData } : {}),
    })
    close()
  }
}

function close() {
  emit('close')
}

// ── 粘贴事件（全局） ──
function onPaste(e) {
  if (activeTab.value !== 'image') return
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) handleImageFile(file)
      break
    }
  }
}

onMounted(async () => {
  document.addEventListener('paste', onPaste)
  // 加载最新的 AI 配置
  const cfg = getAiConfig()
  aiCfg.value = cfg
  // 加载提示词模块供编辑器使用
  aiModule = await import('@/api/ai')
})

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
})
</script>
