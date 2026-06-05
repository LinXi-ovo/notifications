/**
 * Mermaid 数据分离工具
 *
 * Token 格式: [[!mermaid_abc123]]  （Obsidian 风格双链）
 * Map 格式:   { [id]: { code: "原始代码", title: "标题(可选)" } }
 *          兼容旧格式: { [id]: "原始代码" }
 *
 * 编辑器内: 用户自己粘贴 [[!mermaid_xxx]]，纯文本
 * 保存时:   扫描 Token，替换为 <div data-mermaid="CODE">
 * 加载时:   扫描 <div data-mermaid>，提取代码存入 Map，替换为 Token
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
 * 输入: <div data-mermaid="CODE1"></div><p>text</p><div data-mermaid="CODE2"></div>
 * 输出: {
 *   html: '[[!id1]]<p>text</p>\n\n[[!id2]]',
 *   map:  { id1: { code: 'CODE1' }, id2: { code: 'CODE2' } }
 * }
 */
export function parseMermaid(html) {
  const map = {}
  let result = html.replace(/<div\s+data-mermaid="([^"]*?)"\s*><\/div>/g, (match, code) => {
    const id = genId()
    map[id] = { code }
    return makeToken(id)
  })
  // Token 之间加空行分隔
  result = result.replace(/\]\](\s*)\[\[/g, ']]\n\n[[')
  return { html: result, map }
}

/**
 * mergeMermaid(html, map) — 保存时: Token → HTML
 *
 * 扫描 [[!id]]（兼容 <p>[[!id]]</p> 包裹格式）
 * 替换为 <div data-mermaid="CODE">
 */
export function mergeMermaid(html, map) {
  if (!map || Object.keys(map).length === 0) return html
  const replacer = (match, id) => {
    const entry = map[id]
    if (!entry) return match
    const code = typeof entry === 'object' ? entry.code : entry
    if (!code) return match
    const escaped = code.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<div data-mermaid="${escaped}"></div>`
  }
  return html
    .replace(/<p[^>]*>\[\[!(mermaid_[a-z0-9]{8})\]\]<\/p>/g, replacer)
    .replace(/\[\[!(mermaid_[a-z0-9]{8})\]\]/g, replacer)
}
