# Oversight Log

> 疏忽记录，引以为戒。

---

## 2026-06-04：COS 跨域配置遗漏

**场景**：从 Base64 迁移到腾讯云 COS 文件存储后，上传文件时浏览器报 CORS 错误。

**根因**：创建 COS 存储桶后，只配了访问权限（公有读私有写），但**没有配置跨域访问（CORS）规则**。浏览器安全策略阻止了来自 Pages 域名的上传请求。

**教训**：接入任何外部存储服务时，CORS 配置是和访问权限并列的**必选项**，不是可选项。两步必须一起做：

```
① 访问权限（公有读私有写） ✓ 没忘
② 跨域 CORS（允许 Pages 域名） ✗ 忘了
```

**修复**：在 COS 控制台 → 安全管理 → CORS 添加规则，来源填 Pages 域名。

**如何避免再犯**：
- 涉及浏览器端上传/读取外部资源的改动，检查清单增加「CORS 配置」项
- 特别是：COS、R2、S3 等对象存储，首次接入必配 CORS

---

## 2026-06-04：PDF.js Worker 路径错误（Vite）

**场景**：集成 PDF.js 做内嵌预览，弹窗显示空白、页码 1/0。

**根因**：`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` 在 Vite 构建时解析不到正确的 worker 路径。

**教训**：
- ❌ `new URL(... import.meta.url).toString()` — Vite 构建时路径解析可能出错
- ✅ `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` — `?url` 后缀让 Vite 返回正确的资源 URL

**修复**：改用 `?url` 导入，worker 正常加载。

---

## 2026-06-05：编辑器工具栏空安全漏检

**场景**：编辑器初始化未完成时点击工具栏按钮（H1、加粗等），页面崩溃。

**根因**：`ed.value?.chain().focus()` — `?.` 只保证 `chain()` 不报错，但返回 `undefined`，后续 `.focus()` 在 `undefined` 上调用导致 TypeError。

**教训**：可选链 `?.` 只保一步，不保后续调用链。需要 `&&` 短路或者完整 if 判断。

**修复**：
- ❌ `ed.value?.chain().focus().run()` — 编辑器未就绪时报错
- ✅ `ed.value && ed.value.chain().focus().run()` — 编辑器未就绪时跳过

---

## 2026-06-05：插入链接用 prompt() 导致闪退

**场景**：🔗 按钮弹出浏览器 `prompt()` 输入框，输入后确认时编辑器崩溃，已有链接也被清除。

**根因**：`prompt()` 是浏览器同步弹窗，会阻塞并重置编辑器焦点和选区状态。确认后编辑器内的选区已丢失，`setLink` 操作失败。

**教训**：在富文本编辑器等有状态组件中，避免使用浏览器原生 `prompt()`/`confirm()`/`alert()`。应使用内联组件替代。

**修复**：替换为 Vue 内联输入框 + Enter/Escape 键盘事件。同时必须在展开输入框前 `savedRange` 保存选区状态，否则输入框抢焦点后选区丢失、链接操作失败。

**Tiptap 官方做法**：`useLinkHandler` hook 通过 `extendMarkRange('link')` + `setLink` 处理链接，推荐参考。

---

## 2026-06-05：Vue 响应式系统干扰 ProseMirror 编辑器内部状态

**场景**：在 RichEditor 组件模板内用 `v-show` 放置链接输入框，用户点击 🔗 按钮时输入框闪现后编辑器崩溃。

**根因**：即使 `v-show` 不增删 DOM（只是切换 CSS display），以下流程仍触发了崩溃：
1. `showLinkInput = true` → Vue 更新响应式系统
2. 模板重新求值 → ProseMirror 感知到外部 DOM/状态变化
3. `nextTick` 聚焦输入框 → 编辑器失焦 → ProseMirror 内部清理与 Vue 变更检测产生冲突

`v-if` 更糟（直接增删 DOM 节点），但 `v-show` 也不安全——**任何在编辑器组件模板内的响应式状态变化，都可能触发 ProseMirror 的内部状态机出错**。

**教训**：Tiptap（ProseMirror）有自己独立的 DOM 管理和状态系统。Vue 的响应式更新（即使只是 CSS 显隐）如果发生在编辑器所在的组件树内，可能与 ProseMirror 的内部状态冲突。编辑器相关的 UI 控件（弹窗、输入框、下拉菜单）应该：
- ❌ 放入编辑器组件的模板内（即使 `v-show`）
- ✅ 通过 `<Teleport to="body">` 渲染到组件树之外
- ✅ 或者作为一个完全独立的兄弟组件（非嵌套）

**修复**：改用 `<Teleport to="body"><div v-if="showLinkInput">...`，输入框 DOM 渲染在 `<body>` 下，和编辑器组件树彻底隔离。同时将 `watch(showLinkInput, ...)` 改为 `handleInsertLink()` 同步保存选区，消除响应式副作用的时机窗口。

---

## 2026-06-05：图片压缩未兜底

**场景**：上传部分特殊格式图片时，`compressImage` 的 `Image.onerror` 触发，上传失败报"图片加载失败"。

**根因**：压缩函数假定所有图片都能被 `Image()` 元素正常解码，但部分格式（如 WebP/HEIC 变种）可能加载失败。

**教训**：任何非核心功能（如压缩）都应有兜底路径，不能因为辅助功能阻塞主流程（上传）。

**修复**：`compressImage` 失败时 catch，直接上传原图。
