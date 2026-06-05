/**
 * wangEditor Mermaid 自定义元素
 *
 * parseHtml / render / elemToHtml 三件套注册。
 * 编辑器内显示为带样式的占位块，SVG 渲染交给详情页。
 */
import { Boot } from '@wangeditor/editor'
import { h } from 'snabbdom'

// ── HTML → Slate 元素 ──
function parseMermaidHtml(domElem) {
  const code = domElem.getAttribute('data-mermaid') || ''
  return { type: 'mermaid', code, children: [{ text: '' }] }
}

// ── 编辑器内渲染（占位符） ──
function renderMermaid(elem, children, editor) {
  const code = elem.code || ''
  const firstLine = (code.split('\n')[0] || '').trim() || 'Mermaid'

  return h('div', {
    style: {
      padding: '8px 12px',
      margin: '8px 0',
      background: '#f8f9fa',
      border: '1px dashed #d0d5dd',
      borderRadius: '6px',
      color: '#667085',
      fontSize: '13px',
      fontFamily: 'monospace',
      cursor: 'default',
    },
    attrs: {
      'data-mermaid': code,
      'contenteditable': 'false',
    },
  }, `📊 ${firstLine}`)
}

// ── Slate 元素 → HTML ──
function mermaidToHtml(elem) {
  const code = elem.code || ''
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<div data-mermaid="${escaped}"></div>`
}

// ── 注册 ──
try {
  Boot.registerModule({
    renderElems: [{ type: 'mermaid', renderElem: renderMermaid }],
    elemsToHtml: [{ type: 'mermaid', elemToHtml: mermaidToHtml }],
    parseElemsHtml: [{ selector: 'div[data-mermaid]', parseElemHtml: parseMermaidHtml }],
  })
} catch (e) {
  console.warn('[Mermaid] 注册失败:', e.message)
}
