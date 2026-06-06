/**
 * JumpLink — 通知/任务/节点跳转链接渲染
 *
 * 在 HTML 内容中将 [[notif:id]] / [[mission:id]] / [[node:id]] 标记
 * 替换为可点击的 `<a>` 跳转链接。
 *
 * 标记格式（Obsidian 风格双链）:
 *   [[notif:abc123]]        → 跳转到通知详情
 *   [[mission:xyz789]]      → 跳转到任务 DAG 图
 *   [[node:node_def]]       → 跳转到任务的某个节点（需 missionId 上下文）
 *
 * 用法:
 *   import { renderJumpLinks } from '@/utils/jump-link'
 *   const html = renderJumpLinks(content)
 */

/** 单个标记的正则 */
const TOKEN_RE = /\[\[(notif|mission|node):([^\]]+)\]\]/g

/**
 * 渲染 JumpLink — 将内容中的 [[type:id]] 替换为可点击链接
 *
 * @param {string} html - 原始 HTML 内容（可能含 [[...]] 标记）
 * @param {Object} [opts] - 选项
 * @param {string} [opts.missionId] - node 类型跳转需要的任务 ID 上下文
 * @returns {string} 替换后的 HTML
 */
export function renderJumpLinks(html, opts = {}) {
  if (!html) return html

  return html.replace(TOKEN_RE, (match, type, id) => {
    const trimmedId = id.trim()
    if (!trimmedId) return match

    switch (type) {
      case 'notif':
        return renderNotifLink(trimmedId)
      case 'mission':
        return renderMissionLink(trimmedId)
      case 'node':
        return renderNodeLink(trimmedId, opts.missionId)
      default:
        return match
    }
  })
}

/**
 * 渲染通知跳转链接
 * [[notif:abc123]] → <a href="#/detail/abc123">
 */
function renderNotifLink(id) {
  const href = `/#/detail/${encodeURIComponent(id)}`
  return `<a href="${href}" class="jump-link jump-notif" target="_self" title="跳转到通知">📰 ${escapeHtml(id)}</a>`
}

/**
 * 渲染任务跳转链接
 * [[mission:xyz789]] → <a href="#/mission/xyz789">
 */
function renderMissionLink(id) {
  const href = `/#/mission/${encodeURIComponent(id)}`
  return `<a href="${href}" class="jump-link jump-mission" target="_self" title="跳转到任务">📋 ${escapeHtml(id)}</a>`
}

/**
 * 渲染节点跳转链接
 * [[node:node_def]] → <a href="#/mission/{missionId}?node=node_def">
 * 未传递 missionId 时仍生成相对链接，由前端路由处理
 */
function renderNodeLink(id, missionId) {
  let href
  if (missionId) {
    href = `/#/mission/${encodeURIComponent(missionId)}?node=${encodeURIComponent(id)}`
  } else {
    href = `/#/mission?node=${encodeURIComponent(id)}`
  }
  return `<a href="${href}" class="jump-link jump-node" target="_self" title="跳转到任务节点">📌 ${escapeHtml(id)}</a>`
}

/** 简易 HTML 转义 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 检测文本是否包含 JumpLink 标记
 * @param {string} text
 * @returns {boolean}
 */
export function hasJumpLinks(text) {
  if (!text) return false
  TOKEN_RE.lastIndex = 0
  return TOKEN_RE.test(text)
}

/**
 * 提取文本中所有 JumpLink 引用
 * @param {string} text
 * @returns {Array<{type: string, id: string}>}
 */
export function extractJumpLinks(text) {
  const results = []
  if (!text) return results
  TOKEN_RE.lastIndex = 0
  let m
  while ((m = TOKEN_RE.exec(text)) !== null) {
    results.push({ type: m[1], id: m[2].trim() })
  }
  return results
}
