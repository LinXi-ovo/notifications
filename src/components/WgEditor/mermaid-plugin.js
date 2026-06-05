/**
 * wangEditor Mermaid 自定义元素
 *
 * 让 wangEditor 识别、保留并渲染 `<div data-mermaid="...">`。
 * 在编辑器启动前通过 Boot.registerModule() 注册。
 */
import { Boot } from '@wangeditor/editor'
import { h } from 'snabbdom'

// ── HTML → Slate 元素 ──
function parseMermaidHtml(domElem) {
  const code = domElem.getAttribute('data-mermaid') || ''
  return { type: 'mermaid', code, children: [{ text: '' }] } // void 元素必须有 children
}

// ── 编辑器内渲染 ──
function renderMermaid(elem, children, editor) {
  const code = elem.code || ''
  // 显示代码预览（截取前两行）
  const preview = code.split('\n').slice(0, 2).join('  ')

  return h('div', {
    props: {
      class: 'mermaid-placeholder',
      contentEditable: 'false',
    },
    attrs: {
      'data-mermaid': code,
    },
  }, [
    h('div', { props: { class: 'mermaid-placeholder-header' } }, [
      h('span', '📊 Mermaid'),
      h('span', { props: { class: 'mermaid-placeholder-edit' } }, '双击编辑'),
     ]),
    h('pre', { props: { class: 'mermaid-placeholder-code' } }, preview),
  ])
}

// ── Slate 元素 → HTML ──
function mermaidToHtml(elem, editor) {
  const code = elem.code || ''
  const escaped = code.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<div data-mermaid="${escaped}"></div>`
}

// ── 注册 ──
const mermaidModule = {
  renderElems: [{ type: 'mermaid', renderElem: renderMermaid }],
  elemsToHtml: [{ type: 'mermaid', elemToHtml: mermaidToHtml }],
  parseElemsHtml: [{ selector: 'div[data-mermaid]', parseElemHtml: parseMermaidHtml }],
}

try {
  Boot.registerModule(mermaidModule)
} catch (e) {
  // HMR 时可能已注册
}
