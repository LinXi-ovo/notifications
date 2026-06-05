/**
 * wangEditor Mermaid 自定义元素
 *
 * 只注册 parseHtml 和 elemToHtml，让 wangEditor 能识别和保留
 * `<div data-mermaid>`，但编辑器内用默认的 fallback 渲染
 * （显示为不可编辑的占位块）。
 * SVG 渲染只发生在详情页和管理后台预览。
 */
import { Boot } from '@wangeditor/editor'

// ── HTML → Slate 元素 ──
function parseMermaidHtml(domElem) {
  const code = domElem.getAttribute('data-mermaid') || ''
  return {
    type: 'mermaid',
    code,
    children: [{ text: '' }], // void 元素必须有 children
  }
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
// 注意：不注册 renderElems，wangEditor 会用默认 fallback 渲染
// 编辑器内显示为不可编辑的空占位块，不影响其他内容
try {
  Boot.registerModule({
    elemsToHtml: [{ type: 'mermaid', elemToHtml: mermaidToHtml }],
    parseElemsHtml: [{ selector: 'div[data-mermaid]', parseElemHtml: parseMermaidHtml }],
  })
} catch (e) {
  console.warn('[Mermaid] 注册失败:', e.message)
}
