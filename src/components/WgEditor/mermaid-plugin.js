/**
 * wangEditor Mermaid 自定义元素
 *
 * 只注册 parseElemsHtml + elemToHtml，保证 data-mermaid 不被丢弃。
 * 不注册 renderElems，避免 snabbdom VNode 兼容问题。
 * 编辑器内 Mermaid 显示为空白区块，但数据可保。
 * 源码模式可见 <div data-mermaid>，SVG 渲染在详情页/预览。
 */
import { Boot } from '@wangeditor/editor'

function parseMermaidHtml(domElem) {
  const code = domElem.getAttribute('data-mermaid') || ''
  return { type: 'mermaid', code, children: [{ text: '' }] }
}

function mermaidToHtml(elem) {
  const code = elem.code || ''
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<div data-mermaid="${escaped}"></div>`
}

try {
  Boot.registerModule({
    elemsToHtml: [{ type: 'mermaid', elemToHtml: mermaidToHtml }],
    parseElemsHtml: [{ selector: 'div[data-mermaid]', parseElemHtml: parseMermaidHtml }],
  })
} catch (e) {
  console.warn('[Mermaid] 注册失败:', e.message)
}
