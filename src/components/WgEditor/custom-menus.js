/**
 * wangEditor 自定义菜单注册
 *
 * 注册 Mermaid/音频/文件附件 三个自定义按钮。
 * 此文件在 import 时执行一次，全局生效。
 */
import { Boot } from '@wangeditor/editor'

// ── Mermaid 菜单 ──
class MermaidMenu {
  constructor() {
    this.title = '📊'
    this.tag = 'button'
    this.width = 36
  }
  getValue() { return '' }
  isActive() { return false }
  isDisabled() { return false }
  exec(editor) {
    const code = window.prompt('粘贴 Mermaid 代码：\ngraph TD / sequenceDiagram / gantt 等', 'graph TD\n  A[开始] --> B[结束]')
    if (!code || !code.trim()) return
    const escaped = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    editor.dangerouslyInsertHtml(`<div data-mermaid="${escaped}"></div>`)
  }
}

// ── 音频上传菜单 ──
class AudioMenu {
  constructor() {
    this.title = '🔊'
    this.tag = 'button'
    this.width = 36
  }
  getValue() { return '' }
  isActive() { return false }
  isDisabled() { return false }
  exec(editor) {
    const ed = editor
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.onchange = async function () {
      const file = this.files[0]
      if (!file) return
      try {
        const { uploadFile } = await import('@/api/cos')
        const url = await uploadFile(file)
        ed.dangerouslyInsertHtml(
          `<p><audio controls src="${url}"></audio> ${file.name}</p>`
        )
      } catch (e) {
        ed.dangerouslyInsertHtml(`<p>❌ 音频上传失败: ${e.message}</p>`)
      }
    }
    input.click()
  }
}

// ── 文件附件菜单 ──
class FileMenu {
  constructor() {
    this.title = '📎'
    this.tag = 'button'
    this.width = 36
  }
  getValue() { return '' }
  isActive() { return false }
  isDisabled() { return false }
  exec(editor) {
    const ed = editor
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar'
    input.onchange = async function () {
      const file = this.files[0]
      if (!file) return
      try {
        const { uploadFile } = await import('@/api/cos')
        const url = await uploadFile(file)
        if (file.type === 'application/pdf') {
          ed.dangerouslyInsertHtml(
            `<p><a href="${url}" target="_blank" class="inline-flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg no-underline text-sm">📄 ${file.name} <span class="text-xs text-red-400">点击预览</span></a></p>`
          )
        } else {
          ed.dangerouslyInsertHtml(`<p><a href="${url}" target="_blank">📎 ${file.name}</a></p>`)
        }
      } catch (e) {
        ed.dangerouslyInsertHtml(`<p>❌ 文件上传失败: ${e.message}</p>`)
      }
    }
    input.click()
  }
}

// ── 注册 ──
const customMenus = [
  { key: 'insertMermaid', factory: () => new MermaidMenu() },
  { key: 'insertAudio', factory: () => new AudioMenu() },
  { key: 'insertFile', factory: () => new FileMenu() },
]

customMenus.forEach(conf => {
  try {
    Boot.registerMenu(conf)
  } catch (e) {
    // HMR / 重复注册时忽略
    console.debug(`wangEditor menu "${conf.key}" 已注册，跳过`)
  }
})
