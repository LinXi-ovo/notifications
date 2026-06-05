# HANDOVER — PDF 预览修复

## 工作简述

修复 PdfPreview.vue 的 iframe PDF 预览问题：@error 事件不可靠、无加载状态、无超时降级、iOS Safari 不支持内嵌 PDF。

## 分析结论

### 当前问题

当前的 PdfPreview.vue 使用 `<iframe>` 的 `@error` 事件检测 PDF 加载失败，但该事件存在严重缺陷：

1. **`@error` 不可靠** — iframe 的 `@error` 事件只在网络级错误（DNS 失败、连接拒绝）时触发，PDF 加载失败（COS 返回 `Content-Disposition: attachment`、浏览器不支持内嵌渲染等场景）**不会触发**。用户看到空白 iframe 但没有任何错误提示。

2. **无加载状态** — 没有 loading 指示器，大文件加载期间用户看到一片空白。

3. **无超时降级** — 如果 iframe 卡住（如网络慢导致 PDF 加载超时），用户无法获知。

4. **iOS Safari 不支持** — iOS Safari 的 iframe 无法激活内置 PDF 阅读器，内容框空白，且没有任何提示。

5. **COS Content-Disposition** — 腾讯云 COS 默认返回 `Content-Disposition: attachment`，浏览器可能直接下载而不是在 iframe 中渲染。方案文档 `solution/pdf-preview-via-cos.md` 记录了需在 COS 控制台配置 `inline`，但未实施。

### 修复方案

| 改进点 | 方案 |
|--------|------|
| @error 不可靠 | 改用 `@load` + 超时机制（10秒未响应显示降级） |
| 无加载状态 | 添加 loading spinner |
| 无超时降级 | 10 秒超时 → 显示错误 + 「在新标签页打开」按钮 |
| iOS Safari | 通过 UA 检测直接降级（显示错误 + 打开按钮） |
| 用户体验 | 添加「重试」按钮、保留下载和打开按钮 |

修复后的组件状态机：`loading` → `loaded`（超时前 `@load` 触发）或 `error`（超时/降级）。

## 已修改

- `src/components/PdfPreview.vue` — 完整重写

## Git 标签

将在提交后标注。

## 待办

- [ ] 配置 COS 控制台 `Content-Disposition = inline`（可选，可优化直接打开体验）
- [ ] 考虑将 `PdfPreview.vue` 进一步封装为通用文件预览组件（支持图片/音视频/PDF）

## 关键文件索引

```
PDF 预览:
  src/components/PdfPreview.vue       ← PDF 预览模态框
  solution/pdf-preview-via-cos.md    ← 方案文档

详情页集成:
  src/views/DetailView.vue           ← PDF 链接点击 → PdfPreview
```

## 已知问题

- Android Chrome 部分版本在 iframe 中加载 PDF 可能弹出下载栏而非直接预览（浏览器行为，无法控制）
- 最可靠的查看方式始终是「在新标签页中打开」（放在错误降级 UI 和顶部 header 中）
