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
- [x] PDF/Office 内嵌预览或下载（PDF.js）

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

**技术选型（2026-06-05 决策）**：

| 方案 | 说明 | 结论 |
|---|---|---|
| **Tesseract.js** | 纯前端 OCR，浏览器运行，不需 API Key | ❌ 中文精度一般，速度慢 |
| **百度 OCR API** | 免费额度 500 次/天，支持手写/印刷体 | ✅ **选定** — 中文最成熟，有聊天记录专用接口 |
| **腾讯云 OCR** | 免费额度 1000 次/月，微信场景优化好 | ⏸ 备选，和 COS 同平台但百度 OCR 中文更强 |
| **DeepSeek 多模态** | 直接分析截图 | ⏸ 备选，等待 API 灰度开放 |

**最终流程**：

```
用户截图 → 前端压缩 → 百度 OCR API（通用文字识别 / 聊天记录识别）
  → 提取文字 → 填入 AiGenerator 提示词 → DeepSeek 生成结构化通知
                      ↑                           ↑
              百度只做文字提取              DeepSeek 做内容生成
              各司其职，成本最低
```

**复杂度**：低。前端直调百度 OCR API（有 JS SDK），不需要中间服务。

**注意事项**：
- 百度 OCR API Key 不能直接暴露在前端——需要 Cloudflare Worker 代理或后端代理
- 或者用百度 OCR 的 `access_token` 方案（AK/SK 换 token，token 可暴露但有有效期，降低风险）
- 微信聊天截图有多人对话气泡，百度有专门的「聊天记录识别」接口，比通用 OCR 更适合

### 5. 通知提醒 / 截止日期 ⏰

**状态**：📋 规划中

**问题**：通知（如作业提交、材料截止、活动报名）有截止日期，用户容易忘记。

**需求**：
- 通知可以设置截止日期（deadline）
- 用户可以收藏/订阅某个通知
- 在截止日期前 N 时间（2小时/0.3天/1天）自动提醒订阅者
- 提醒方式：站内横幅（打开 App 时）+ 浏览器推送通知

**数据模型**：

```
Notification 表增加字段：
  deadline: Date        — 截止日期（可选）
  reminderLeadTime: Array(String) — 提前提醒时间，如 ["2h", "0.3d", "1d"]

Reminder 表（新）：
  user: Pointer(User)   — 被提醒人
  notification: Pointer(Notification) — 关联通知
  remindAt: Date        — 计划提醒时间
  reminded: Boolean     — 是否已提醒
  remindedAt: Date      — 实际提醒时间
```

**架构决策**：

| 方案 | 说明 | 推荐 |
|------|------|------|
| **浏览器定时检查** | 打开 App 时检查未读提醒，弹横幅 | ✅ 必做，简单可靠 |
| **Browser Notification API** | 浏览器原生推送通知（关掉页面也能弹） | ✅ 可选增强 |
| **Bmob 云函数定时任务** | 服务端自动发邮件/推送 | ❌ Bmob 云函数能力有限 |
| **WebSocket 长连接** | 实时推送 | ❌ 需要额外服务，小工具过度设计 |
| **邮件提醒** | 发送邮件到用户邮箱 | ❌ 需要邮件服务，且用户不一定查收 |

**实施阶段**：

#### Phase 1：通知 data model（小）

```
① Notification 表增加 deadline、reminderLeadTime 字段
  - deadline: Date（可选，通知有截止日期时设置）
  - reminderLeadTime: ["2h", "0.3d", "1d"]（可选，预设快选）
② NotificationForm 增加截止日期输入（日期选择器 + 快选预设）
③ 详情页显示截止日期倒计时
```

**预估**：小，1 天

#### Phase 2：收藏订阅 + 站内提醒（中）

```
① 收藏即订阅：收藏某条通知 = 订阅其提醒
② Reminder 数据表 + API（checkReminders、ackReminder）
③ 首页/全局组件：登录时检查未读提醒
  - 有到期提醒时弹出横幅（toast 或 modal）
  - 点击跳转到对应通知详情
④ 活动开始时弹出"📢 xxxxx 即将截止！"
```

**提醒触发逻辑**：
```
用户打开 App → 遍历用户收藏的通知 → 检查 deadline
  → 对于每个 deadline，计算当前时间是否在提醒窗口内
  → 是 → 展示提醒标记已提醒（localStorage 防止重复弹）
```

**预估**：中，1-2 天

#### Phase 3：浏览器推送通知（小）

```
① 请求 Notification API 权限
② 注册 Service Worker（Vite PWA 插件）
③ 即使用户关闭页面，也能在截止前收到桌面推送
```

**预估**：小，0.5 天

**完整度**：低中高 ⬜⬜⬜（Phase 1 → 2 → 3）

**复杂度**：低。核心是 data model + 前端定时检查，不需要后端服务。

---

## 当前状态

**当前阶段**：第四阶段 ✅ 基本完成
**完成度**：95%
**最新更新**：2026-06-05 — 新增提醒功能规划（Phase 1-3），链接/OCR/PDF 均已完成
**备注**：Bmob 文件服务需备案域名 ≥10 天 → 临时用 Base64 内嵌 + 图片自动压缩，后续可升级到腾讯云 COS

## 执行顺序

| 优先级 | 任务 | 预估 | 状态 |
|---|---|---|---|
| P0 | 管理员权限管理 | 小 | ✅ |
| P1 | 文件存储升级（Base64 → COS） | 中 | ✅ |
| P2 | AI 智能生成通知 | 大 | ✅ |
| P3 | 通知提醒 / 截止日期 | 中 | 📋 规划中 |

## 文件存储决策

| 阶段 | 方案 | 状态 |
|---|---|---|
| 当前（临时） | Base64 直接嵌入内容 | ✅ 已定 |
| 未来（升级） | 腾讯云 COS / 阿里云 OSS | 📌 需要时切换 |
