# HANDOVER — 编辑器替换 + Mermaid 数据分离

## 工作简述

替换 Tiptap（ProseMirror）为 wangEditor，实现 Mermaid 流程图数据分离方案（Token/Map 模式），新增调试模式/设置页/测试通知类型。

## 已完成

### 1. 编辑器替换（Tiptap → wangEditor）
- 卸载全部 `@tiptap/*` 包（6 个），安装 `@wangeditor/editor` + `@wangeditor/editor-for-vue@next`
- 新建 `src/components/WgEditor.vue`，替代 `RichEditor.vue`
- 功能迁移：图片上传（COS + 压缩）、音频/文件上传、HTML 源码模式、粘贴自动处理
- 自定义菜单：Mermaid/音频/文件 三个工具栏按钮
- 删除旧文件：`RichEditor.vue`、`Toolbar.vue`、`MermaidNode.js`、`MermaidView.vue`
- 更新 `NotificationForm.vue` 引用

### 2. Mermaid 数据分离（Token/Map 模式）
- `src/utils/mermaid-token.js`：核心工具函数
  - `parseMermaid(html)` — 加载时 `<div data-mermaid>` → `[[!id]]` Token
  - `mergeMermaid(html, map)` — 保存时 `[[!id]]` → `<div data-mermaid>`
  - `autoFixMermaidQuotes(code)` — 自动修复中文引号
  - `extractUsedIds(html)` — 扫描用过哪些 Token
- `src/components/MermaidManager.vue`：管理对话框
  - 新建/编辑/删除 Mermaid 条目 + 实时 SVG 预览
  - 复制 `[[!id]]` Token（带 Toast 反馈）
  - 调试模式预设（4 种一键插入）
  - 手动「清除未使用的」条目
- `src/components/WgEditor/custom-menus.js`：📊 按钮打开 MermaidManager
- `src/components/WgEditor/mermaid-plugin.js`：备用 slate 元素注册（仅 parseHtml + elemToHtml）
- 编码安全文档 `design/mermaid/encoding-safety.md`（escAttr 编码 / decodeEntities 解码）
- AI 生成集成：AiGenerator prompt 增加 mermaid 字段，自动生成 Token 注入正文
- 通过 sessionStorage 传递 AI 生成的 mermaidMap 到 WgEditor

### 3. 新功能
- **设置页** `src/views/SettingsView.vue`，路由 `/settings`，导航栏 ⚙️ 入口
- **调试模式**：管理员可开启，详情页显示 HTML 源码查看按钮
- **测试通知类型**：`test`（🧪），默认不显示，设置页可开启
- **PDF 预览**：改用 iframe（替代 pdf.js，解决 COS CORS 问题），方案文档 `solution/pdf-preview-via-cos.md`
- **AdminView 支持 ?edit=xxx**：详情页点「编辑」跳转管理后台自动打开表单

### 4. 开发者工具
- `dev_tools/create-test-notification.cjs`：CLI 创建测试通知（4 种模板：mermaid/basic/deadline/rich）

### 5. 文档
- `CLAUDE.md` 已更新（tech stack、项目结构、已删除文件清单）
- `README.md` 已更新
- `design/mermaid.md` 架构设计文档
- `plan/editor-data-strategy.md` / `plan/editor-data-strategy-old.md`
- `doc/chat-ocr-workflow/skill.md` 更新 Mermaid 说明

## Git 标签

`v0.3.0-mermaid`

## 关键架构决策

| 决策 | 方案 | 原因 |
|------|------|------|
| 编辑器 | wangEditor | HTML 内容模型，不吞自定义元素 |
| Mermaid 存储 | Token/Map 分离 | 编辑器只存纯文本 `[[!id]]`，数据独立管理 |
| 保存/加载 | 字符串正则替换 | 不依赖编辑器 API，零白屏风险 |
| 中文引号 | autoFixMermaidQuotes | Mermaid v11 要求中文加引号，自动修复 |
| 调试模式 | localStorage + 管理员权限 | 安全可控 |
| PDF 预览 | iframe | 浏览器原生支持，零维护 |

## 待办

- [ ] 通知提醒 / 截止日期功能（已规划 `plan/reminder.md`）
- [ ] Todo 待办清单（Phase 5）
- [ ] 移动端编辑体验优化
- [ ] 数据统计 / 通知阅读量
- [ ] mermaid-plugin.js 可废弃（当前 Token 方案已覆盖所有场景）

## 关键文件索引

```
编辑/渲染:
  src/components/WgEditor.vue              ← 编辑器主组件
  src/components/WgEditor/custom-menus.js   ← 自定义菜单注册
  src/components/WgEditor/mermaid-plugin.js ← 备用 slate 元素
  src/components/MermaidManager.vue         ← Mermaid 管理对话框
  src/components/NotificationForm.vue       ← 通知表单
  src/components/AiGenerator.vue            ← AI 生成

工具函数:
  src/utils/mermaid-token.js     ← parse/merge/autoFix
  src/api/notification.js        ← 通知 API（含 showTest 参数）
  src/stores/notification.js     ← 通知状态管理

页面:
  src/views/DetailView.vue       ← 详情（Mermaid/PDF/图片渲染）
  src/views/AdminView.vue        ← 管理后台
  src/views/SettingsView.vue     ← 设置页

文档:
  design/mermaid.md              ← Mermaid 架构设计
  design/mermaid/encoding-safety.md ← 编码安全
  solution/pdf-preview-via-cos.md   ← PDF 预览方案
  plan/editor-data-strategy.md   ← 数据分离方案
  plan/reminder.md               ← 提醒功能规划
  dev_tools/                     ← 开发者工具
```

## 已知问题

- Mermaid 编辑器占位不可点击编辑（需通过 MermaidManager）
- wangEditor 自定义菜单用 window.dispatchEvent 通信（非 Vue 原生）
- mermaid-plugin.js 与 Token 方案共存，可逐步废弃
