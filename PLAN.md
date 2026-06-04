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

**状态**：✅ 已完成（UserRoles 表 + 超管/管理员分级）

### 2. 文件存储升级：Base64 → 腾讯云 COS 🗄️

**状态**：🔄 进行中（存储桶已创建，待接入代码）

**已完成**：
- ✅ 腾讯云 COS 存储桶已创建（广州地域，公有读私有写）
- ✅ COS JS SDK 接入，编辑器上传走 COS（替换 Base64）
- ✅ CORS 跨域配置（Pages 域名 + localhost）
- ✅ 上传图片自动压缩 + `Cache-Control` 缓存一年
- ✅ GitHub Secrets 配置（COS_SECRET_ID / COS_SECRET_KEY）

**待完成**：
- [ ] COS 防盗链配置（Referer 白名单，只允许 Pages 域名访问）
- [ ] PDF.js 内嵌预览（浏览器端渲染，解决 COS 无法预览问题）
- [ ] 更新 README 文档

### 3. AI 智能生成通知 🤖

**状态**：✅ 已完成（DeepSeek + AiGenerator 组件）

**问题**：从微信复制通知 → 手动粘贴到编辑器 → 格式化 → 传附件，操作链长。

**方案**：
- 在 AdminView 增加「AI 生成」入口
- 粘贴原始内容（微信消息、原文链接、截图等）到输入框
- 调用 DeepSeek API 分析、提取字段、生成结构化通知
- 自动填入标题、内容（含格式化 HTML）、分类、标签、来源等
- 支持上传附件（图片/PDF）让 AI 提取内容并内嵌

**技术选型**：

| 层 | 选型 | 理由 |
|---|---|---|
| SDK | `openai` npm 包 | DeepSeek 完全兼容 OpenAI 格式，改 `baseURL` 即可；文档最全、社区最大、支持流式 |
| 模型 | DeepSeek 最新模型 | 用户偏好，性价比高 |
| API 代理 | Cloudflare Worker | 隐藏 API Key 不暴露到浏览器，和 Pages 同一平台 |
| API Key 来源 | VITE_DEEPSEEK_API_KEY | 通过 GitHub Secrets 注入构建环境 |

### 4. 微信截图 → OCR → 聊天记录 → 通知 🤳

**问题**：微信群通知以截图形式传播，手动提取内容麻烦。

**方案**：

```
① 拖入或粘贴微信聊天截图
    ↓
② OCR 提取文字 + 发言人识别
    ↓
③ 还原为结构化聊天记录（谁说了什么、时间线）
    ↓
④ 直接导入 AI 生成通知，或复制为纯文本格式
```

**技术选型**：

| 方案 | 说明 | 费用 |
|---|---|---|
| **Tesseract.js** | 纯前端 OCR，浏览器运行，不需 API Key | 免费，速度慢，中文精度一般 |
| **百度 OCR API** | 免费额度 500 次/天，支持手写/印刷体 | 免费够用 |
| **腾讯云 OCR** | 免费额度 1000 次/月，微信场景优化好 | 免费 |
| **直接调用 DeepSeek 看图** | DeepSeek 多模态模型直接分析截图 | token 计费 |

**最佳路线**：拖入截图 → DeepSeek 多模态直接分析（不走传统 OCR），提取文字 → 按发言人/时间整理 → 填入 AiGenerator 或导出为聊天记录格式。

**复杂度**：中低。前端截图上传 → 调 DeepSeek 看图 → 解析结果。

**架构**：
```
浏览器 AdminView
  ↓ 调 Worker（不含 Key）
Cloudflare Worker
  ↓ 拼接 Key 转发
DeepSeek API
  ↓ 返回结果
Worker 解析 → 返回结构化通知
```

**复杂度**：中高，需要 Worker 部署、提示词工程、结果解析

---

## 当前状态

**当前阶段**：第三阶段 ✅ 完成 · 第四阶段进行中
**完成度**：92%
**最新更新**：2026-06-04 — 下一步：管理员权限管理
**备注**：Bmob 文件服务需备案域名 ≥10 天 → 临时用 Base64 内嵌 + 图片自动压缩，后续可升级到腾讯云 COS

## 执行顺序

| 优先级 | 任务 | 预估 |
|---|---|---|
| P0 | 管理员权限管理（role 字段 + 管理页面） | 小 |
| P1 | 文件存储升级（Base64 → COS） | 中 |
| P2 | AI 智能生成通知（DeepSeek + Worker 代理） | 大 |

## 文件存储决策

| 阶段 | 方案 | 状态 |
|---|---|---|
| 当前（临时） | Base64 直接嵌入内容 | ✅ 已定 |
| 未来（升级） | 腾讯云 COS / 阿里云 OSS | 📌 需要时切换 |
