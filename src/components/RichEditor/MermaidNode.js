import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MermaidView from './MermaidView.vue'

export const MermaidNode = Node.create({
  name: 'mermaid',

  group: 'block',

  atom: true, // 整体不可拆分

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n  A[开始] --> B[结束]',
        parseHTML: el => el.getAttribute('data-mermaid') || '',
        renderHTML: attrs => ({ 'data-mermaid': attrs.code })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'mermaid-wrapper' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(MermaidView)
  },

  addCommands() {
    return {
      insertMermaid: code => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { code: code || 'graph TD\n  A[新流程图] --> B[结束]' }
        })
      }
    }
  }
})
