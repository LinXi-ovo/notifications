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

## 2026-06-05：编辑器工具栏按钮闪退（误判为空安全）

**场景**：点击工具栏任意按钮（B/I/U/H1/列表等），页面闪退。

**最初认为的根因**：`ed.value?.chain().focus()` — `?.` 使 `chain()` 返回 `undefined`，`.focus()` 报错。

**最初修复**：`ed.value && ed.value.chain().focus().run()`。

**后续发现**：全部工具栏按钮（包括只 emit 的媒体按钮）都闪退，说明不是 JavaScript 空安全的问题。

**真实根因**：浏览器 `mousedown` 事件触发时，按钮会**抢走编辑器的焦点**。编辑器失焦触发 `blur` → Vue 响应式更新 → 此时再执行 `chain().focus()` 时编辑器处于不一致的过渡状态，导致崩溃。

**真实修复**：在所有按钮上加 `@mousedown.prevent`，阻止 `mousedown` 默认行为，焦点留在编辑器内。

**教训**：Tiptap（ProseMirror）对焦点变化非常敏感。任何可能从编辑器移走焦点的 UI 交互（按钮点击、输入框聚焦、弹窗打开），都需要防止浏览器默认的焦点转移行为。

---

## 2026-06-05：插入链接用 prompt() 导致闪退（误判）

**场景**：🔗 按钮弹出浏览器 `prompt()` 输入框，输入后确认时编辑器崩溃，已有链接也被清除。

**最初认为的根因**：`prompt()` 是浏览器同步弹窗，会阻塞并重置编辑器焦点和选区状态。确认后编辑器内的选区已丢失，`setLink` 操作失败。

**最初修复**：替换为 Vue 内联输入框 + Enter/Escape 键盘事件 + `savedRange`。

**后续发现**：经过 6 轮迭代（prompt → setTimeout → v-if → v-show → Teleport → 最终删掉所有自定义 UI），发现**根因根本不是 prompt()，而是 Vue 组件层的响应式系统对 ProseMirror 的干扰**。

纯 `prompt()` + `editor.chain().focus().setLink({ href }).run()` 不会崩溃。之前崩溃是因为同时存在 savedRange、watch、v-show 等 Vue 响应式状态，ProseMirror 在失焦/重聚焦过程中与 Vue 的变更检测冲突。

**最终结论**：浏览器 contenteditable 原生支持选中文字后 Ctrl+V 粘贴 URL 生成超链接。不需要任何自定义 UI。🔗 按钮只需要提示用户快捷键即可。

**教训**：在富文本编辑器场景中，优先利用浏览器原生能力，不要试图用自定义组件替代浏览器的内置行为。

---

## 2026-06-05：Vue 响应式系统干扰 ProseMirror 编辑器内部状态（绕远路）

**场景**：在 RichEditor 组件模板内用 `v-show` 放置链接输入框，用户点击 🔗 按钮时输入框闪现后编辑器崩溃。

**根因**：同上一条——根本问题不是 `v-show`/Teleport，而是**不该自己实现链接 UI**。浏览器 contenteditable 原生支持此功能。

**最初结论（已推翻）**：认为 `v-show` 的 CSS display 切换 + `nextTick` 聚焦 + 编辑器失焦的时序会导致 ProseMirror 内部状态紊乱。

**最初修复**：改用 `<Teleport to="body">` 将输入框移出组件树。

**最终结论**：这 200 行代码都不需要。🔗 按钮 → alert 提示快捷键 → 用户 Ctrl+V 粘贴即可。浏览器原生能力 > 任何自定义实现。

---

## 2026-06-05：图片压缩未兜底

**场景**：上传部分特殊格式图片时，`compressImage` 的 `Image.onerror` 触发，上传失败报"图片加载失败"。

**根因**：压缩函数假定所有图片都能被 `Image()` 元素正常解码，但部分格式（如 WebP/HEIC 变种）可能加载失败。

**教训**：任何非核心功能（如压缩）都应有兜底路径，不能因为辅助功能阻塞主流程（上传）。

**修复**：`compressImage` 失败时 catch，直接上传原图。
