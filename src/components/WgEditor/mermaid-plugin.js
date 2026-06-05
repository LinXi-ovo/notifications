/**
 * wangEditor Mermaid 自定义元素
 *
 * parseElemsHtml: 把 <div data-mermaid> 转成 slate 元素，同时提取第一行作为可见文字
 * elemToHtml: 把 slate 元素转回 <div data-mermaid>
 * 不注册 renderElems，用 wangEditor 默认渲染显示 div 里面的文字
 */
import { Boot } from '@wangeditor/editor'

function parseMermaidHtml(domElem) {
  const code = domElem.getAttribute('data-mermaid') || ''
  const firstLine = (code.split('\n')[0] || '').trim() || 'Mermaid'
  return {
    type: 'mermaid',
    code,
    children: [{ text: `📊 ${firstLine}` }],
  }
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
