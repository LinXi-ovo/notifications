/**
 * Mermaid 数据分离工具
 *
 * parseMermaid(html)  — 从 HTML 提取 Mermaid 代码，替换为 Token
 * mergeMermaid(html, map) — 将 Token 替换回原始 HTML
 *
 * Token 格式: 📊 [Mermaid] <第一行摘要>
 * Map 格式:  { [id]: "原始 Mermaid 代码" }
 * ID 格式:   mermaid_<8位随机字符>
 */

const TOKEN_REGEX = /📊\s*\[Mermaid\]\s*.+?(?=<\/p>|$)/g
const DATA_REGEX = /<div\s+data-mermaid="([^"]*?)"\s*><\/div>/g

/** 生成随机 ID */
function uid() {
  return 'mermaid_' + Math.random().toString(36).slice(2, 10)
}

/** 转义 HTML 属性值 */
function escAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 从 HTML 中提取 Mermaid 代码，返回 { html: 替换后的内容, map: 代码映射 } */
export function parseMermaid(html) {
  const map = {}
  const result = html.replace(DATA_REGEX, (match, code) => {
    const id = uid()
    map[id] = code
    const firstLine = (code.split('\n')[0] || '').trim() || 'Mermaid'
    return `<p>📊 [Mermaid] ${firstLine.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
  })
  return { html: result, map }
}

/** 将 Token 替换回原始 <div data-mermaid> */
export function mergeMermaid(html, map) {
  if (!map || Object.keys(map).length === 0) return html
  return html.replace(TOKEN_REGEX, (match) => {
    // 从 map 中查找匹配的代码
    // Token 存储在 <p>📊 [Mermaid] firstLine</p> 中
    // 我们根据 p 标签整体匹配
    const pMatch = match.match(/<p>📊\s*\[Mermaid\]\s*(.+?)<\/p>/)
    if (pMatch) {
      // 用第一个可用的 map 条目
      const keys = Object.keys(map)
      if (keys.length > 0) {
        const id = keys[0]
        const code = map[id]
        delete map[id] // 消费掉，避免重复使用
        return `<div data-mermaid="${escAttr(code)}"></div>`
      }
    }
    return match // 找不到就保留原样
  })
}

/** 从 Token 文本中提取 ID（如果有的话） */
export function extractTokenId(text) {
  const match = text.match(/mermaid_([a-z0-9]{8})/)
  return match ? match[0] : null
}

/** 检测文本是否为 Mermaid Token */
export function isToken(text) {
  return /📊\s*\[Mermaid\]/.test(text)
}
