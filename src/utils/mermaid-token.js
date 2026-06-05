/**
 * Mermaid 数据分离工具
 *
 * Token 格式: [[!mermaid_abc123]]  （Obsidian 风格双链，! 前缀区分）
 * Map 格式:   { [id]: "原始 Mermaid 代码" }
 * ID 格式:    mermaid_<8位随机字符>
 *
 * 编辑器内: 用户自己粘贴 [[!mermaid_xxx]]，纯文本，wangEditor 完全支持
 * 保存时:   扫描所有 [[!mermaid_xxx]]，替换为 <div data-mermaid="CODE">
 * 加载时:   扫描所有 <div data-mermaid>，提取代码存入 Map，替换为 [[!mermaid_xxx]]
 */

const TOKEN_PREFIX = '[[!'
const TOKEN_SUFFIX = ']]'

/** 生成随机 ID */
export function genId() {
  return 'mermaid_' + Math.random().toString(36).slice(2, 10)
}

/** 构建 Token 字符串 */
export function makeToken(id) {
  return `${TOKEN_PREFIX}${id}${TOKEN_SUFFIX}`
}

/** 检测字符串是否为 Mermaid Token */
export function isToken(text) {
  return text.startsWith(TOKEN_PREFIX) && text.endsWith(TOKEN_SUFFIX)
}

/** 从 Token 提取 ID */
export function extractId(token) {
  const m = token.match(/\[\[!(mermaid_[a-z0-9]{8})\]\]/)
  return m ? m[1] : null
}

/**
 * 从 HTML 提取 Mermaid 代码，替换为 Token
 * 输入: <div data-mermaid="CODE"></div><p>text</p>
 * 输出: { html: "[[!mermaid_xxx]]<p>text</p>", map: { mermaid_xxx: "CODE" } }
 */
export function parseMermaid(html) {
  const map = {}
  const result = html.replace(/<div\s+data-mermaid="([^"]*?)"\s*><\/div>/g, (match, code) => {
    const id = genId()
    map[id] = code
    return makeToken(id)
  })
  return { html: result, map }
}

/**
 * 将 Token 替换回原始 <div data-mermaid>
 * 输入: "[[!mermaid_xxx]]<p>text</p>" + { mermaid_xxx: "CODE" }
 * 输出: '<div data-mermaid="CODE"></div><p>text</p>'
 */
export function mergeMermaid(html, map) {
  if (!map || Object.keys(map).length === 0) return html
  return html.replace(/\[\[!(mermaid_[a-z0-9]{8})\]\]/g, (match, id) => {
    const code = map[id]
    if (!code) return match // 找不到就不替换
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return `<div data-mermaid="${escaped}"></div>`
  })
}
