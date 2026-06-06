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
// 可编辑提示词系统
// ═══════════════════════════════════

/** 默认提示词模板 */
export const DEFAULT_PROMPTS = {
  notification: `你是一个大学通知整理助手。将以下原始内容整理为一条结构化通知。

## 处理规则

1. **保持原意**：不要概括、重写或润色通知内容。提取的文字应忠于原文，只修正 OCR 识别错误（如"锿子"→"孩子"）。多条独立通知（不同话题/不同发布人/明显分隔）用 --- 分隔输出，不要合并成一条。
2. **附件占位符**：如果内容中包含图片/文件/音频，在原文出现的位置插入占位符：{{图片: 描述}}、{{文件: 文件名}}、{{音频: 描述}}
3. **提取元信息**：从内容中提取来源群组、发布人、截止日期。截止日期格式如"2026-06-20"或"2026年6月20日"
4. **去除冗余**：过滤系统消息（"你已添加了xx"）、时间戳、无关对话
5. **时间归一化**：统一日期格式为 ISO（YYYY-MM-DD）
6. **链接可点击**：如果正文包含 URL（如 https://...），在 content 中将其格式化为可点击的 HTML 链接：`<a href="URL" target="_blank" rel="noopener noreferrer">🔗 链接描述</a>`。描述应提取自原文上下文（如"🔗 微助教离散数学作业"），不要直接用 URL 作为显示文字。

## 输出格式

只返回 JSON 格式（不要其他文字）：

{
  "title": "通知标题",
  "content": "<p>格式化后的 HTML 正文，附件占位符保留在原文位置，段落用</p><p>分隔</p>",
  "type": "分类标识（从以下选择：{categories}）",
  "sourceGroup": "来源群组",
  "sourcePerson": "发布人",
  "originalLink": "原文链接（如果有URL则提取，没有则留空）",
  "priority": 0,
  "tags": ["标签1", "标签2"],
  "deadline": "截止日期（ISO格式如2026-06-20，没有则留空字符串）",
  "mermaid": []
}

优先级：0=普通, 1=置顶, 2=重要, 3=紧急。根据内容判断。

mermaid 说明：
- 如果内容有流程/步骤/时间线/决策分支，生成 Mermaid 代码
- title 为图表标题，code 为纯 Mermaid 代码（无 \`\`\` 标记）
- 中文标签必须用双引号包裹：A["开始"]
- 不需要时留空数组 []

原始内容：
{input}`,
  mission: `同时，从以上原始内容中提取出任务信息，生成一个配套的任务 DAG（有向无环图）。
你必须返回一个包含 "notification" 和 "mission" 两个顶级字段的 JSON 对象，分别输出通知和任务数据。

## 任务生成规则

1. **忠实于原文**：不要添加原文中没有的角色或步骤
2. **合理拆解**：将原文中的多个步骤拆分为多个节点（2~5个节点），每个节点一个明确的任务
3. **明确依赖**：有先后顺序的步骤用 dependsOn 表达
4. **角色精简**：角色数量控制在 1-5 个
5. **标题简洁**：节点标题控制在 10 字以内，动词开头
6. **合理使用截止日期**：原文中提到的日期才加 deadline，不自行编造

## 输出格式

{
  "notification": {
    // 同上方通知 JSON 格式：title, content, type, sourceGroup, sourcePerson, originalLink, priority, tags, deadline, mermaid
  },
  "mission": {
    "title": "任务标题（与通知标题对应）",
    "description": "任务总体描述",
    "tags": ["标签1", "标签2"],
    "roles": [
      {
        "name": "角色名称（如：普通成员、班长、审核员）",
        "color": "十六进制颜色如 #3B82F6",
        "emoji": "Emoji 图标如 👤",
        "claimPolicy": "free | approval | password | delegated",
        "maxAssignees": 999
      }
    ],
    "nodes": [
      {
        "title": "节点标题（动词+宾语，如"填写个人信息表"）",
        "description": "节点描述，说明具体要做什么",
        "assignedRole": "角色名称（必须匹配 roles 中的 name）",
        "completionRule": "single | count | all",
        "completionTarget": 1,
        "priority": 1,
        "deadline": "截止日期（ISO格式，选填）",
        "dependsOn": ["前置节点标题列表，填写对应节点的 title"],
        "tags": ["标签1", "标签2"]
      }
    ]
  }
}

### completionRule 说明
- single: 任意一人完成即完成（单人任务）
- count: 累计 N 人完成，completionTarget 为目标人数
- all: 所有认领人必须完成

### claimPolicy 说明
- free: 自由认领，点击即生效
- approval: 需管理员审批
- password: 口令认领（如 { "type": "password", "password": "abc123" }）
- delegated: 管理员委派，不可自荐

原始内容：
{input}`,
  image: `请详细描述这张图片中的文字内容。提取所有可见的文字信息，包括标题、正文、来源、日期。{extra}`,
}

const PROMPT_STORAGE_KEY = 'ai:prompts'

/** 获取指定 key 的提示词（优先返回 localStorage 中的自定义版本） */
export function getPrompt(key) {
  try {
    const custom = JSON.parse(localStorage.getItem(PROMPT_STORAGE_KEY) || '{}')
    if (custom[key]) return custom[key]
  } catch { /* ignore */ }
  return DEFAULT_PROMPTS[key]
}

/** 获取所有可编辑的提示词 */
export function getAllPrompts() {
  const result = {}
  for (const key of Object.keys(DEFAULT_PROMPTS)) {
    result[key] = getPrompt(key)
  }
  return result
}

/** 设置自定义提示词 */
export function setPrompt(key, value) {
  try {
    const custom = JSON.parse(localStorage.getItem(PROMPT_STORAGE_KEY) || '{}')
    custom[key] = value
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(custom))
  } catch { /* ignore */ }
}

/** 重置指定提示词到默认 */
export function resetPrompt(key) {
  try {
    const custom = JSON.parse(localStorage.getItem(PROMPT_STORAGE_KEY) || '{}')
    delete custom[key]
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(custom))
  } catch { /* ignore */ }
}

/** 重置所有提示词到默认 */
export function resetAllPrompts() {
  localStorage.removeItem(PROMPT_STORAGE_KEY)
}

/** 调试模式是否开启 */
export function isAiDebugMode() {
  return localStorage.getItem('mermaid-debug') === 'true'
}

// ═══════════════════════════════════
// 核心函数
// ═══════════════════════════════════

/**
 * 调用 AI 生成结构化通知
 * @param {string} rawInput - 原始粘贴内容
 * @param {object[]} categories - 可用分类列表
 * @param {object} [options] - 配置覆盖
 * @param {boolean} [options.withMission] - 是否同时生成配套任务
 * @returns {Promise<object>} { title, content, type, ... missionData? }
 */
export async function generateNotification(rawInput, categories, options = {}) {
  const config = getAiConfig(options)
  const provider = PROVIDERS[config.provider]
  if (!provider) throw new Error(`未知 AI 提供商: ${config.provider}`)
  if (!config.apiKey) throw new Error(`未配置 ${provider.name} API Key`)

  // 构建提示词
  const catInfo = categories.map(c => `${c.name}(${c.value})`).join('、')
  let prompt = getPrompt('notification')
    .replace('{categories}', catInfo)
    .replace('{input}', rawInput)

  // 如需生成任务，追加任务提示词
  if (options.withMission) {
    const missionPrompt = getPrompt('mission')
    prompt += '\n\n' + missionPrompt
  }

  const text = await callLLM(prompt, config)
  const result = parseResult(text)

  // 处理 combined 格式：{ notification: {...}, mission: {...} }
  if (result.notification) {
    const notificationData = result.notification
    // 如果有 mission，设置为 _missionData
    if (result.mission) {
      notificationData._missionData = result.mission
    }
    // 处理 mermaid（从 notification 中提取）
    const mermaidMap = extractMermaid(notificationData)
    if (mermaidMap) notificationData._mermaidMap = mermaidMap
    return notificationData
  }

  // 处理 flat 格式：{ title, content, ..., mission?: {...} }
  if (result.mission) {
    result._missionData = result.mission
    delete result.mission
  }

  return result
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
 * @param {boolean} [options.withMission] - 是否同时生成配套任务
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

  const template = getPrompt('notification')
    .replace('{categories}', catInfo)
    .replace('{input}', '（见图片中的文字内容）')

  let systemPrompt = `你是一个大学通知整理助手。用户会发一张通知截图给你，请：
1. 提取图片中的所有文字
2. 将其整理为一条结构化通知
3. 只返回 JSON 格式（不要其他文字）

${template}`

  if (options.withMission) {
    systemPrompt += '\n\n' + getPrompt('mission')
  }

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
  const result = parseResult(text)

  // 处理 combined 格式：{ notification: {...}, mission: {...} }
  if (result.notification) {
    const notificationData = result.notification
    if (result.mission) {
      notificationData._missionData = result.mission
    }
    const mermaidMap = extractMermaid(notificationData)
    if (mermaidMap) notificationData._mermaidMap = mermaidMap
    return notificationData
  }

  if (result.mission) {
    result._missionData = result.mission
    delete result.mission
  }

  return result
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

/** 解析 AI 返回的 JSON 结果并处理 Mermaid */
function parseResult(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 返回格式异常，未找到 JSON')

  const result = JSON.parse(jsonMatch[0])

  // 处理 Mermaid
  const mermaidMap = extractMermaid(result)
  if (mermaidMap) result._mermaidMap = mermaidMap

  return result
}

/**
 * 从结果对象中提取 Mermaid 数据，返回 mermaidMap 或 null
 * @param {object} obj - 包含 mermaid 数组的对象
 */
function extractMermaid(obj) {
  if (!obj.mermaid?.length) return null
  const mermaidMap = {}
  let content = obj.content || ''
  obj.mermaid.forEach((item) => {
    if (!item.code) return
    const id = 'mermaid_' + Math.random().toString(36).slice(2, 10)
    mermaidMap[id] = { code: item.code, title: item.title || '' }
    content += `\n\n<p>[[!${id}]]</p>`
  })
  obj.content = content
  return mermaidMap
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
