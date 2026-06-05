/**
 * Mermaid 数据分离工具
 *
 * Token 格式: [[!mermaid_abc123]]  （Obsidian 风格双链）
 * Map 格式:   { [id]: { code: "原始代码", title: "标题(可选)" } }
 *          兼容旧格式: { [id]: "原始代码" }
 */

export function genId() {
  return 'mermaid_' + Math.random().toString(36).slice(2, 10)
}

/** 构建 Token 字符串 */
export function makeToken(id) {
  return `[[!${id}]]`
}

/** 检测文本是否包含 Mermaid Token */
export function isToken(text) {
  return /\[\[!mermaid_[a-z0-9]{8}\]\]/.test(text)
}

/** 从文本提取 Token ID */
export function extractId(text) {
  const m = text.match(/\[\[!(mermaid_[a-z0-9]{8})\]\]/)
  return m ? m[1] : null
}

/** 解码 HTML 实体 */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** 获取 Mermaid 条目的显示标题 */
export function getTitle(entry) {
  if (!entry) return 'Mermaid'
  const code = typeof entry === 'string' ? entry : entry.code
  const title = typeof entry === 'object' ? entry.title : ''
  return title || (code.split('\n')[0] || '').trim() || 'Mermaid'
}

/**
 * parseMermaid(html) — 加载时: HTML → Token
 *
 * 输入: <div data-mermaid="CODE1"></div><p>text</p>
 * 输出: { html: '[[!id1]]<p>text</p>', map: { id1: { code: 'CODE1' } } }
 */
export function parseMermaid(html) {
  const map = {}
  let result = html.replace(/<div\s+data-mermaid="([^"]*?)"\s*><\/div>/g, (match, code) => {
    const id = genId()
    // 解码 HTML 实体，防止双重编码
    map[id] = { code: decodeEntities(code) }
    return makeToken(id)
  })
  // Token 之间加空行分隔
  result = result.replace(/\]\](\s*)\[\[/g, ']]\n\n[[')
  return { html: result, map }
}

/**
 * mergeMermaid(html, map) — 保存时: Token → HTML
 *
 * 扫描 [[!id]]（兼容 <p>[[!id]]</p> 包裹）
 * 替换为 <div data-mermaid="CODE">
 * 同时返回清洗后的 map（移除已删除 Token 的条目）
 *
 * 返回值: { html: string, map: Record<string, { code: string, title?: string }> }
 */
export function mergeMermaid(html, map) {
  if (!map || Object.keys(map).length === 0) return { html, map }

  const usedIds = new Set()
  const replacer = (match, id) => {
    const entry = map[id]
    if (!entry) return match
    const code = typeof entry === 'object' ? entry.code : entry
    if (!code) return match
    usedIds.add(id)
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<div data-mermaid="${escaped}"></div>`
  }

  const newHtml = html
    .replace(/<p[^>]*>\[\[!(mermaid_[a-z0-9]{8})\]\]<\/p>/g, replacer)
    .replace(/\[\[!(mermaid_[a-z0-9]{8})\]\]/g, replacer)

  // 清洗 Map：只保留 Token 仍在编辑器中使用的条目
  const cleanMap = {}
  for (const id of usedIds) {
    cleanMap[id] = map[id]
  }

  return { html: newHtml, map: cleanMap }
}
