# PDF 预览方案：COS + iframe + 优雅降级

## 问题

腾讯云 COS 存储的 PDF 文件在浏览器中直接打开时，COS 默认返回 `Content-Disposition: attachment`，导致：
- 浏览器直接下载而非内联预览
- iframe 加载了 PDF 内容但无法渲染（用户看到空白框）
- pdf.js 跨域加载失败

## 状态机

```
 ┌──────────┐    @load      ┌──────────┐    2秒后     ┌────────────────┐
 │  loading  │ ──────────→  │  loaded   │ ────────→  │ loaded + hint   │
 │ (spinner) │              │ (iframe)  │            │ (iframe + 提示)  │
 └──────────┘              └──────────┘            └────────────────┘
       │                        │
       │ 超时 10s               │ 用户点击「未显示？」
       ↓                        ↓
 ┌──────────┐            ┌──────────────────┐
 │  error    │            │ 新标签页打开 PDF  │
 │ (降级UI)  │            └──────────────────┘
 └──────────┘
```

### 各状态说明

- **loading**: iframe 加载中，显示 spinner
- **loaded**: iframe 加载完成，显示 iframe（PDF 可能正常渲染，也可能因为 COS 的 Content-Disposition 策略导致空白）
- **loaded + hint**: 加载完成 2 秒后在底部浮出「📂 未显示？在新标签页中打开」——这是关键设计：COS Content-Disposition 导致浏览器没有渲染 PDF 时，用户有退路
- **error**: 加载超时 / iOS 不支持

## 实现文件

### PdfPreview.vue

`src/components/PdfPreview.vue` — 预览模态框

关键逻辑：

1. **@load + 超时双保险**：iframe `@load` 事件（HTTP 成功）→ loaded；10 秒未触发 → error（真加载失败）
2. **2 秒延迟提示**：loaded 后 2 秒浮出 hint（应对 COS 的 Content-Disposition: attachment 导致空白）
3. **iOS 降级**：UA 检测 iOS Safari → 直接 error（iOS 不在 iframe 中激活 PDF 阅读器）
4. **重试**：改 `:key` 强制重创建 iframe
5. **下载按钮始终在顶部**

### DetailView.vue PDF 拦截

`src/views/DetailView.vue` — 通过 `querySelectorAll('a[href$=".pdf"]')` 查找内容中的 PDF 链接，拦截点击后打开 PdfPreview 模态框。

```js
const pdfLinks = contentRef.value.querySelectorAll('a[href$=".pdf"]')
pdfLinks.forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault()
    pdfPreview.value = { show: true, url: a.href, filename }
  })
})
```

## 编辑器的链接粘贴差异（重要）

| 功能 | Tiptap (旧) | wangEditor (当前) |
|------|-------------|-------------------|
| URL 粘贴自动链接 | ✅ `LinkExt` 自动将粘贴的 URL 转为 `<a>` 标签 | ❌ 默认保持纯文本 |
| 链接颜色高亮 | ✅ `[&_a]:text-blue-600 [&_a]:underline` | ❌ 无样式（纯文本） |
| HTML 内容模型 | ✅ 保留自定义属性 | ❌ `slate.js` 只保留原生支持的属性 |

### 修复

在 `WgEditor.vue` 的 `handleCustomPaste` 中添加 URL 自动检测：

```js
// 自动链接粘贴的 URL（还原 Tiptap LinkExt 行为）
if (text && /^https?:\/\/[^\s]+$/.test(text.trim())) {
  event.preventDefault()
  callback(false)
  const url = text.trim()
  editor.dangerouslyInsertHtml(
    `<p><a href="${escapeAttr(url)}" target="_blank">${escapeHtml(url)}</a></p>`
  )
  return
}
```

## COS 配置（可选优化）

如需让 COS URL 直接内联预览而非下载，在 COS 控制台设置：

```
存储桶 → 数据处理 → 高级设置 → 自定义头部
文件后缀: .pdf
Header: Content-Disposition = inline
```

当前方案在未配置此设置时，通过 2 秒后的「未显示？」提示提供降级路径，用户体验完整。

## 方案对比

| 方案 | 维护量 | 兼容性 | 当前状态 |
|------|--------|--------|----------|
| **iframe + hint 降级** | 低 | 桌面端好，iOS 降级提示 | ✅ 当前方案 |
| COS 配置 `Content-Disposition: inline` | 零维护（配一次） | 好 | ⏳ 可选优化 |
| pdf.js | 高（worker + cmap） | 好 | ❌ 已废弃（CORS 问题） |
| `<object>` / `<embed>` 标签 | 中 | 与 iframe 类似 | ❌ 未采用（无优势） |
