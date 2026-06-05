<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="close">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
      <!-- 头部 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-bold text-gray-800 m-0">🤖 AI 生成通知</h3>
        <button class="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl" @click="close">✕</button>
      </div>

      <!-- 内容 -->
      <div class="px-6 py-4 space-y-4 overflow-y-auto flex-1">
        <!-- Tab 切换 -->
        <div class="flex border-b border-gray-200 -mx-6 px-6">
          <button
            class="px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer bg-transparent"
            :class="ocrTab ? 'border-transparent text-gray-400 hover:text-gray-600' : 'border-blue-500 text-blue-600 font-medium'"
            @click="ocrTab = false"
          >🤖 AI 生成</button>
          <button
            class="px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer bg-transparent"
            :class="ocrTab ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'"
            @click="ocrTab = true"
          >📷 OCR 结果</button>
        </div>

        <!-- Tab: AI 生成 -->
        <template v-if="!ocrTab">
          <!-- 输入原始内容 -->
        <div>
          <label class="block text-sm text-gray-600 mb-1">粘贴原始内容（微信消息、原文链接、截图文字等）</label>
          <textarea
            v-model="rawInput"
            class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            rows="8"
            placeholder="例如：&#10;各位同学好，&#10;2025-2026学年综合素质测评工作现已启动，请各位同学在6月15日前登录教务系统提交申请。&#10;附件：综测评分细则.pdf&#10;来源：年级群 · 辅导员李老师"
          ></textarea>
        </div>

        <!-- 分类提示 -->
        <div v-if="categories.length" class="text-xs text-gray-400">
          可识别的分类：{{ categories.map(c => c.icon + c.name).join('、') }}
        </div>

        <!-- 生成结果预览 -->
        <div v-if="result" class="space-y-3 bg-gray-50 rounded-lg p-4 border">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-500">标题</label>
              <p class="text-sm font-medium text-gray-800">{{ result.title }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">分类</label>
              <p class="text-sm">{{ result.type ? (typeLabel(result.type) || result.type) : '未识别' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">来源群组</label>
              <p class="text-sm text-gray-600">{{ result.sourceGroup || '—' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">发布人</label>
              <p class="text-sm text-gray-600">{{ result.sourcePerson || '—' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">优先级</label>
              <p class="text-sm">{{ result.priority > 0 ? priorityLabel(result.priority) : '普通' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">标签</label>
              <p class="text-sm text-gray-600">{{ result.tags?.length ? result.tags.join(', ') : '—' }}</p>
            </div>
          </div>
          <div>
            <label class="text-xs text-gray-500">正文内容</label>
            <div class="text-sm text-gray-700 mt-1 p-3 bg-white rounded border" v-html="result.content"></div>
          </div>
          <div v-if="result.originalLink" class="text-xs text-blue-500">
            🔗 {{ result.originalLink }}
          </div>
        </div>

        <!-- 错误 -->
        <div v-if="error" class="text-sm text-red-500 bg-red-50 rounded p-3">{{ error }}</div>
        </template>

        <!-- Tab: OCR 结果 -->
        <template v-if="ocrTab">
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

          <!-- 自动提取的标题 -->
          <div v-if="ocrTitle" class="flex items-center gap-2 text-sm bg-blue-50 rounded px-3 py-2 border border-blue-100">
            <span class="text-xs text-blue-500 shrink-0">自动提取标题</span>
            <span class="text-blue-700">{{ ocrTitle }}</span>
          </div>

          <div v-if="!ocrRaw.trim()" class="text-xs text-gray-400 text-center py-8">
            粘贴豆包输出后，点「📥 填入编辑器」→ 标题自动填入、正文进入编辑器，<br>
            \{\{图片: xxx\}\} 占位符原样保留，手动替换即可
          </div>
        </template>
      </div>

      <!-- 底部 -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <span class="text-xs text-gray-400">{{ result ? '✅ 已生成，可点击"填入表单"' : '' }}</span>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 text-sm text-gray-500 bg-white border rounded hover:bg-gray-50 cursor-pointer"
            @click="close"
          >
            取消
          </button>
          <!-- OCR tab 按钮 -->
          <button
            v-if="ocrTab"
            class="px-4 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!ocrRaw.trim()"
            @click="applyOcr"
          >
            📥 填入编辑器
          </button>
          <!-- AI 生成 tab 按钮 -->
          <template v-else>
            <button
              v-if="result"
              class="px-4 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer border-none"
              @click="apply"
            >
              📋 填入表单
            </button>
            <button
              v-else
              class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="generating || !rawInput.trim()"
              @click="generate"
            >
              {{ generating ? '⏳ 生成中...' : '🚀 AI 生成' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'apply'])

const rawInput = ref('')
const generating = ref(false)
const error = ref('')
const result = ref(null)

// OCR tab
const ocrTab = ref(false)
const ocrRaw = ref('')
const ocrTitle = ref('')

const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY

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

async function generate() {
  if (!rawInput.value.trim() || generating.value) return
  if (!apiKey) {
    error.value = '未配置 DeepSeek API Key，请在 .env 中设置 VITE_DEEPSEEK_API_KEY'
    return
  }

  generating.value = true
  error.value = ''
  result.value = null

  const catInfo = props.categories.map(c => `${c.name}(${c.value})`).join('、')

  const prompt = `你是一个大学通知整理助手。将以下原始内容整理为一条结构化通知，只返回 JSON 格式（不要其他文字）：

{
  "title": "通知标题",
  "content": "<p>格式化后的HTML正文，段落用&lt;/p&gt;&lt;p&gt;分隔</p>",
  "type": "分类标识（从以下选择：${catInfo}）",
  "sourceGroup": "来源群组",
  "sourcePerson": "发布人",
  "originalLink": "原文链接（如果有URL则提取）",
  "priority": 0,
  "tags": ["标签1", "标签2"]
}

优先级：0=普通, 1=置顶, 2=重要, 3=紧急。根据内容判断。

原始内容：
${rawInput.value}`

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    })

    const data = await response.json()

    if (data.error) {
      error.value = 'API 错误: ' + (data.error.message || JSON.stringify(data.error))
      return
    }

    const text = data.choices?.[0]?.message?.content || ''
    // 提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      error.value = 'AI 返回格式异常，请重试'
      console.error('Raw response:', text)
      return
    }

    result.value = JSON.parse(jsonMatch[0])
  } catch (e) {
    error.value = '请求失败: ' + (e.message || e)
  } finally {
    generating.value = false
  }
}

// ── OCR tab ──
function extractTitleFromOcr() {
  const text = ocrRaw.value.trim()
  if (!text) { ocrTitle.value = ''; return }
  // 取第一行非空文本，去掉开头的 emoji 和特殊字符
  const firstLine = text.split('\n').find(l => l.trim().length > 0)
  ocrTitle.value = firstLine ? firstLine.replace(/^[\s📢📣⭐🔴🚨⚠️✅📋📌📍🎯🎉💡]+/, '').trim() : ''
}

function applyOcr() {
  const text = ocrRaw.value.trim()
  if (!text) return

  // 分离标题和正文：第一行非空行为标题，后续为正文
  const lines = text.split('\n')
  const title = ocrTitle.value
  // 跳过第一行（标题行），后续组成正文
  const bodyLines = lines.slice(1).join('\n').trim()

  // 纯文本转简单 HTML（段落用 <p>，占位符保留）
  const contentHtml = textToHtml(bodyLines || text)

  emit('apply', {
    title: title,
    content: contentHtml,
    type: '',
    sourceGroup: '',
    sourcePerson: '',
    priority: 0,
    tags: [],
    originalLink: ''
  })
  close()
}

function textToHtml(text) {
  // 分割段落（连续空行隔开的段落分别包 <p>）
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean)
  if (paragraphs.length === 0) return `<p>${escapeHtml(text)}</p>`
  return paragraphs.map(p => `<p>${escapeHtml(p.trim())}</p>`).join('\n')
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function apply() {
  if (result.value) {
    emit('apply', { ...result.value })
    close()
  }
}

function close() {
  emit('close')
}
</script>
