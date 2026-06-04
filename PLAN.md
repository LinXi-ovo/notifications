# PLAN.md — 项目进度跟踪

> 📢 大学微信通知聚合器 · Vite + Vue 3 + Tiptap + Bmob

---

## 第一阶段：项目基础搭建 🏗️

**目标**：项目骨架搭好，能跑起来

- [x] `npm create vite` 初始化 Vue 3 项目
- [x] 安装全部依赖（Tailwind, Vue Router, Pinia, hydrogen-js-sdk, Tiptap）
- [x] 配置 Tailwind + Vite
- [x] 创建完整目录结构 + 组件骨架
- [x] 写 API 层（Bmob 封装：查询/用户/文件）
- [x] 创建 `.env.example` + `src/api/bmob.js`
- [x] 写 README.md（含数据迁移方案附录）
- [x] git init + 首次 commit
- [x] 将后端从 LeanCloud 切换为 Bmob
- [x] 注册 Bmob 应用，获取 Secret Key + API 安全码
- [x] 在 Bmob 创建数据表 + 初始分类数据
- [x] 配置 GitHub Actions deploy.yml

---

## 第二阶段：核心浏览功能 👀

**目标**：用户能看到通知列表、筛选、搜索、详情

- [x] 路由系统（HomeView / DetailView / LoginView / AdminView / FavoritesView）
- [x] CategoryNav 从 Bmob 动态加载分类
- [x] SearchBar 搜索（300ms 防抖）
- [x] NotificationCard 组件（优先级样式、分类图标）
- [x] NotificationList 列表（排序、分页、加载/空状态）
- [x] NotificationDetail 详情页（HTML 渲染、原文链接）
- [x] 图片点击放大（lightbox）
- [x] 音频内嵌播放器（native audio controls）
- [x] 视频内嵌播放器（native video controls）
- [ ] PDF/Office 内嵌预览或下载

---

## 第三阶段：管理功能 ✏️

**目标**：管理员能登录、写通知、管理分类

- [x] 登录系统（LoginForm + 注册/登录切换）
- [x] NotificationForm（含分类/优先级/标签等分层展开字段）
- [x] AdminView 管理后台（列表 + 新建 + 编辑 + 删除）
- [x] 数据导出（HTML / JSON）
- [x] 路由守卫（限制未登录访问）
- [x] CategoryManagerView 分类管理
- [x] Tiptap 富文本编辑器（工具栏 + 图片粘贴/拖入上传 + HTML 源码切换）

---

## 第四阶段：收藏与分享 ⭐

**目标**：用户能收藏通知，部署上线让大家用

- [x] Favorite 收藏功能（表 + API + 按钮 + 收藏页）
- [ ] ACL 权限精细化配置
- [ ] localStorage 缓存加速
- [ ] Gitee Pages 双推部署
- [ ] GitHub Pages 正式部署

---

## 第五阶段：Todo 待办（可选）✅

**目标**：通知可以关联待办清单，用户打钩跟踪

- [ ] Todo 数据模型 + API
- [ ] TodoProgress 用户完成进度
- [ ] 管理员添加 Todo 项
- [ ] 用户打钩/取消

---

## 未来规划 💡

### 1. 管理员权限管理 🔐

**问题**：目前只有 `admin` 账号有管理权限，想给朋友管理员权限只能共享密码。

**方案**：
- AdminView 增加「管理员管理」页面，可添加/移除其他用户为管理员
- 在 Bmob 建一个 `Roles` 表或给 User 加 `role` 字段（`admin` / `editor` / `user`）
- 路由守卫和 API 权限改为按角色判断，不再硬编码 `username === 'admin'`

### 2. 文件存储升级：Base64 → 对象存储 🗄️

**问题**：Base64 存小图还行，PDF、大文件、视频都不方便。

**方案**：
- 接入腾讯云 COS（JS SDK 前端直传），免费 50GB/月
- 图片/PDF/文件上传到 COS，返回 URL 嵌入编辑器
- 保留文件注册表（File 表），记录文件名↔URL 映射
- 编辑器可拖入 PDF，生成 `<iframe>` 预览或下载链接
- 详情页 PDF 内嵌预览（PDF.js）

**触发条件**：当需要上传 PDF 或大文件时切换。

### 3. AI 智能生成通知 🤖

**问题**：从微信复制通知 → 手动粘贴到编辑器 → 格式化 → 传附件，操作链长。

**方案**：
- 在 AdminView 增加「AI 生成」入口
- 粘贴原始内容（微信消息、原文链接、截图等）到输入框
- 调用 AI API（如 Claude API）分析、提取字段、生成结构化通知
- 自动填入标题、内容（含格式化 HTML）、分类、标签、来源等
- 支持上传附件（图片/PDF）让 AI 提取内容并内嵌

**技术选型**：Claude API（`anthropic-sdk`）+ Vite 环境变量管理 API Key
**复杂度**：中高，需要 API Key、提示词工程、解析结果

---

## 当前状态

**当前阶段**：第三阶段 ✅ 完成 · 第四阶段进行中
**完成度**：92%
**最新更新**：2026-06-04 — 部署到 Cloudflare Pages + 未来规划记录
**备注**：Bmob 文件服务需备案域名 ≥10 天 → 临时用 Base64 内嵌 + 图片自动压缩，后续可升级到腾讯云 COS

## 文件存储决策

| 阶段 | 方案 | 状态 |
|---|---|---|
| 当前（临时） | Base64 直接嵌入内容 | ✅ 已定 |
| 未来（升级） | 腾讯云 COS / 阿里云 OSS | 📌 需要时切换 |
