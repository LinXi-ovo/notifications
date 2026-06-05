/**
 * Mermaid 数据分离工具
 *
 * Token 格式: [[!mermaid_abc123]]  （Obsidian 风格双链）
 * Map 格式:   { [id]: "原始 Mermaid 代码" }
 * ID 格式:    mermaid_<8位随机字符>
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

/** 检测字符串是否为 Mermaid Token */
export function isToken(text) {
  return /\[\[!mermaid_[a-z0-9]{8}\]\]/.test(text)
}

/** 从文本提取 Token ID */
export function extractId(text) {
  const m = text.match(/\[\[!(mermaid_[a-z0-9]{8})\]\]/)
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
 * 兼容 editor.getHtml() 抛出的 <p>[[!xxx]]</p> 包裹格式
 */
export function mergeMermaid(html, map) {
  if (!map || Object.keys(map).length === 0) return html

  // 优先匹配段落包裹的 Token，其次匹配裸 Token
  return html
    .replace(/<p>\[\[!(mermaid_[a-z0-9]{8})\]\]<\/p>/g, (match, id) => {
      return map[id] ? wrapDiv(map[id]) : match
    })
    .replace(/\[\[!(mermaid_[a-z0-9]{8})\]\]/g, (match, id) => {
      return map[id] ? wrapDiv(map[id]) : match
    })
}

function wrapDiv(code) {
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<div data-mermaid="${escaped}"></div>`
}
