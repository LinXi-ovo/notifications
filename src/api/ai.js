/**
 * AI Provider 抽象层
 *
 * 支持 DeepSeek、OpenAI（含视觉）等多个 AI 模型，
 * 统一生成通知和图片理解接口。
 *
 * 配置存储：localStorage（通过 useAiConfigStore 管理）
 */

// ═══════════════════════════════════
// 默认配置
// ═══════════════════════════════════

export const PROVIDERS = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    supportsVision: false,
    defaultModel: 'deepseek-chat',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    envKey: 'VITE_DEEPSEEK_API_KEY',
    description: 'DeepSeek V4（完全兼容 OpenAI 格式，支持联网搜索）',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    supportsVision: true,
    defaultModel: 'gpt-4o-mini',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    envKey: 'VITE_OPENAI_API_KEY',
    description: 'GPT-4o / GPT-4o-mini，支持文本+视觉',
  },
  doubao: {
    id: 'doubao',
    name: '豆包',
    supportsVision: true,
    defaultModel: 'doubao-pro-32k',
    defaultEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    envKey: 'VITE_DOUBAO_API_KEY',
    description: '字节跳动豆包大模型，支持文本+视觉（需要通过推理接入点调用）',
  },
  custom: {
    id: 'custom',
    name: '自定义',
    supportsVision: true, // 由用户自行确认
    defaultModel: '',
    defaultEndpoint: '',
    envKey: '',
    description: '任何 OpenAI 兼容的 API（如本地 ollama、AWS Bedrock、Azure OpenAI 等）',
  },
}

export const DEFAULT_PROVIDER = 'deepseek'

/**
 * 获取 AI 配置
 * 优先级：显式传入 > localStorage > 环境变量
 */
export function getAiConfig(overrides = {}) {
  const stored = loadConfig()
  const provider = overrides.provider || stored.provider || DEFAULT_PROVIDER
  const info = PROVIDERS[provider]
  // 自定义提供商：仅从 localStorage 读取，不从 .env 读
  const envFallback = provider === 'custom' ? '' : (import.meta.env[info?.envKey] || '')
  return {
    provider,
    apiKey: overrides.apiKey || stored.apiKey || envFallback || '',
    model: overrides.model || stored.model || '',
    endpoint: overrides.endpoint || stored.endpoint || '',
  }
}

/** 从 localStorage 加载配置 */
function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem('ai:config') || '{}')
  } catch { return {} }
}

/** 保存配置到 localStorage */
export function saveAiConfig(config) {
  localStorage.setItem('ai:config', JSON.stringify(config))
}

// ═══════════════════════════════════
// 核心函数
// ═══════════════════════════════════

/**
 * 调用 AI 生成结构化通知
 * @param {string} rawInput - 原始粘贴内容
 * @param {object[]} categories - 可用分类列表
 * @param {object} [options] - 配置覆盖
 * @param {string} [options.provider]
 * @param {string} [options.apiKey]
 * @param {string} [options.model]
 * @returns {Promise<object>} { title, content, type, sourceGroup, sourcePerson, priority, tags, mermaidMap }
 */
export async function generateNotification(rawInput, categories, options = {}) {
  const config = getAiConfig(options)
  const provider = PROVIDERS[config.provider]
  if (!provider) throw new Error(`未知 AI 提供商: ${config.provider}`)
  if (!config.apiKey) throw new Error(`未配置 ${provider.name} API Key`)

  const catInfo = categories.map(c => `${c.name}(${c.value})`).join('、')

  const prompt = `你是一个大学通知整理助手。将以下原始内容整理为一条结构化通知，只返回 JSON 格式（不要其他文字）：

{
  "title": "通知标题",
  "content": "<p>格式化后的HTML正文，段落用</p><p>分隔</p>",
  "type": "分类标识（从以下选择：${catInfo}）",
  "sourceGroup": "来源群组",
  "sourcePerson": "发布人",
  "originalLink": "原文链接（如果有URL则提取）",
  "priority": 0,
  "tags": ["标签1", "标签2"],
  "mermaid": [
    { "title": "图标题", "code": "graph TD\\n  A[\\"开始\\"] --> B[\\"结束\\"]" }
  ]
}

优先级：0=普通, 1=置顶, 2=重要, 3=紧急。根据内容判断。

mermaid 说明：
- 如果内容有流程/步骤/时间线/决策分支，生成 Mermaid 代码
- title 为图表标题，code 为纯 Mermaid 代码（无 \`\`\` 标记）
- 中文标签必须用双引号包裹：A["开始"]
- 不需要时留空数组 []

原始内容：
${rawInput}`

  const text = await callLLM(prompt, config)
  return parseResult(text)
}

/**
 * 调用 AI 理解图片内容
 * @param {string} imageUrl - 图片 URL（已上传到 COS）
 * @param {string} [extraPrompt] - 附加指令
 * @param {object} [options] - 配置覆盖
 * @returns {Promise<string>} 提取的文本内容
 */
export async function understandImage(imageUrl, extraPrompt = '', options = {}) {
  const config = getAiConfig(options)
  const provider = PROVIDERS[config.provider]
  if (!provider) throw new Error(`未知 AI 提供商: ${config.provider}`)
  if (!provider.supportsVision) throw new Error(`${provider.name} 不支持图片理解`)
  if (!config.apiKey) throw new Error(`未配置 ${provider.name} API Key`)

  const model = config.model || provider.defaultModel
  const endpoint = config.endpoint || provider.defaultEndpoint

  const prompt = `请详细描述这张图片中的文字内容。提取所有可见的文字信息，包括标题、正文、来源、日期。${extraPrompt ? '\n附加要求：' + extraPrompt : ''}`

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0.1,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.choices?.[0]?.message?.content || ''
}

/**
 * 从图片内容生成通知（图片理解 → 通知生成 一步到位）
 * @param {string} imageUrl - 图片 URL
 * @param {object[]} categories - 可用分类
 * @param {object} [options] - 配置覆盖
 * @returns {Promise<object>} 同 generateNotification
 */
export async function imageToNotification(imageUrl, categories, options = {}) {
  const config = getAiConfig(options)
  const provider = PROVIDERS[config.provider]
  if (!provider) throw new Error(`未知 AI 提供商: ${config.provider}`)
  if (!provider.supportsVision) throw new Error(`${provider.name} 不支持图片理解，无法直接从图片生成通知`)
  if (!config.apiKey) throw new Error(`未配置 ${provider.name} API Key`)

  const model = config.model || provider.defaultModel
  const endpoint = config.endpoint || provider.defaultEndpoint
  const catInfo = categories.map(c => `${c.name}(${c.value})`).join('、')

  const systemPrompt = `你是一个大学通知整理助手。用户会发一张通知截图给你，请：
1. 提取图片中的所有文字
2. 将其整理为一条结构化通知
3. 只返回 JSON 格式（不要其他文字）

{
  "title": "通知标题",
  "content": "<p>格式化后的HTML正文，段落用</p><p>分隔</p>",
  "type": "分类标识（从以下选择：${catInfo}）",
  "sourceGroup": "来源群组",
  "sourcePerson": "发布人",
  "originalLink": "原文链接",
  "priority": 0,
  "tags": ["标签1", "标签2"]
}

优先级：0=普通, 1=置顶, 2=重要, 3=紧急。`

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '请从这张通知截图中提取信息，生成结构化通知：' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0.1,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  const text = data.choices?.[0]?.message?.content || ''
  return parseResult(text)
}

// ═══════════════════════════════════
// 内部辅助函数
// ═══════════════════════════════════

/** 通用 LLM 调用（文本） */
async function callLLM(prompt, config) {
  const provider = PROVIDERS[config.provider]
  const model = config.model || provider.defaultModel
  const endpoint = config.endpoint || provider.defaultEndpoint

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.choices?.[0]?.message?.content || ''
}

/** 解析 AI 返回的 JSON 结果 */
function parseResult(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式异常，未找到 JSON')

  const result = JSON.parse(jsonMatch[0])

  // 处理 Mermaid 代码
  if (result.mermaid?.length) {
    const mermaidMap = {}
    let content = result.content || ''
    result.mermaid.forEach((item) => {
      if (!item.code) return
      const id = 'mermaid_' + Math.random().toString(36).slice(2, 10)
      mermaidMap[id] = { code: item.code, title: item.title || '' }
      content += `\n\n<p>[[!${id}]]</p>`
    })
    result.content = content
    result._mermaidMap = mermaidMap
  }

  return result
}

/** 获取当前可用模型列表 */
export function getModelList(providerId) {
  const lists = {
    deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek V4（最新稳定版）' },
      { id: 'deepseek-chat-v4', name: 'DeepSeek V4 指定版' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1（推理模型）' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' },
    ],
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o-turbo', name: 'GPT-4o Turbo' },
      { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision' },
      { id: 'o1-mini', name: 'o1 Mini' },
      { id: 'o3-mini', name: 'o3 Mini' },
    ],
    doubao: [
      { id: 'doubao-pro-32k', name: '豆包 Pro 32K' },
      { id: 'doubao-pro-128k', name: '豆包 Pro 128K' },
      { id: 'doubao-lite-32k', name: '豆包 Lite 32K' },
      { id: 'doubao-lite-128k', name: '豆包 Lite 128K' },
      { id: 'doubao-vision-pro-32k', name: '豆包视觉 Pro 32K（推荐视觉任务）' },
      { id: 'ep-', name: '推理接入点（格式: ep-xxxx）' },
    ],
    custom: [
      { id: '', name: '自定义输入模型名称' },
    ],
  }
  return lists[providerId] || []
}
