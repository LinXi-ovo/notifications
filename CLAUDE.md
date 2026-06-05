# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 通知聚合器 — 项目文档

## 项目概述

大学微信通知聚合器。将分散在微信群中的通知聚合到一个网页中，支持分类浏览、富文本编辑（含内嵌媒体）、小范围分享、DAG 任务追踪。

## 架构决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 构建工具 | Vite + `@` 路径别名 | 极快 HMR，纯静态输出 |
| 前端框架 | Vue 3 + Composition API | 中文社区最大，文档齐全 |
| CSS | Tailwind CSS v4 (`@tailwindcss/vite` 插件) | 移动端优先，响应式内建 |
| 状态管理 | Pinia (Options API 风格) | Vue 3 官方推荐，1KB 大小 |
| 路由 | Vue Router 4 (Hash 模式) | 配合 Vue 3 的纯静态方案 |
| 后端即服务 | Bmob 后端云 (`hydrogen-js-sdk`) | 国内节点，Parse 衍生，内置用户系统 + ACL |
| 富文本编辑器 | **wangEditor V5** | 原生中文，HTML 内容模型 |
| 流程图 | **Mermaid + Token/Map 数据分离** | 编辑器内纯文本占位 `[[!id]]`，详情页渲染 SVG |
| 文件存储 | 腾讯云 COS (`cos-js-sdk-v5`) | 前端直传，图片自动压缩 |
| 部署 | Cloudflare Pages (主力) + GitHub Pages (备用) | 双线部署 |

### 关键设计思路

- **纯前端 SPA + BaaS**：无需自建服务器，数据层由 Bmob 提供，前端直连 SDK
- **富文本内容内嵌媒体**：图片/音频/视频/PDF 全部嵌入在 HTML 内容中
- **Mermaid Token/Map 分离**：编辑器只存 `[[!id]]` 占位符，独立 Map 存源代码，解耦渲染
- **File 注册表**：维护文件名 → COS URL 的映射
- **ACL 权限**：登录用户可读，管理员可写，未登录不可见
- **调试模式**：设置页开关，管理员可用，显示 HTML 源码、Mermaid 预设等
- **任务 DAG**：哈斯图渲染、编辑/执行双模式、角色名→DEFAULT_PERMISSIONS 自动映射

## Tauri 桌面应用

项目已集成 Tauri v2 桌面壳，将现有 Vue SPA 打包为原生桌面应用（Web 版本不受影响）。

| 能力 | 实现 | 说明 |
|---|---|---|
| 系统托盘 | `src-tauri/src/tray.rs` | 右键菜单（打开/同步/退出），关闭窗口→隐藏到托盘 |
| SQLite 缓存 | `src-tauri/src/db.rs` | 通知/分类离线缓存，`INSERT OR REPLACE` 同步策略 |
| Bmob 同步 | `src-tauri/src/sync.rs` | REST API 增量同步（`updatedAt > lastSyncAt`） |
| 桌面通知 | `src-tauri/src/commands.rs:send_notification` | 基于 `tauri-plugin-notification` |
| 开机自启 | `src-tauri/src/commands.rs:set_autostart` | 基于 `tauri-plugin-autostart` |
| 全局快捷键 | `src-tauri/src/lib.rs` | Ctrl+Shift+N 唤出窗口 |
| Tauri Bridge | `src/api/tauri.js` | 封装 `invoke()`，浏览器环境自动降级 |
| Sync Store | `src/stores/sync.js` | 同步状态管理，托盘事件监听 |

**Rust Commands**：`send_notification`, `sync_now`, `get_sync_status`, `get_cached_notification`, `get_cached_notifications`, `get_cached_categories`, `set_autostart`, `get_autostart`

```bash
npm run tauri:dev           # 启动 Tauri 开发模式（Vite HMR + 原生窗口）
npm run tauri:build         # 构建生产安装包
```

架构详见 [plan/Tauri/PLAN-AI.md](plan/Tauri/PLAN-AI.md)。

## 开发命令

```bash
npm install          # 安装依赖（自动运行 postinstall → patch pdfjs-dist）
npm run dev          # 启动开发服务器（Vite HMR，localhost）
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
npm run tauri:dev    # [Tauri] 开发模式（Vite HMR + 原生窗口）
npm run tauri:build  # [Tauri] 构建桌面安装包
```

**关键注意**：
- 无测试框架、无 ESLint/Prettier 配置——项目纯靠编码约定保证质量
- `postinstall` 脚本自动 patch pdfjs-dist，这是 PDF 预览功能的前提
- `.env` 必须从 `.env.example` 复制并填写后才可运行
- 路径别名 `@` → `src/`，在 `import` 中可用（如 `@/api/bmob`）

## 环境变量

复制 `.env.example` → `.env`：

| 变量 | 用途 |
|---|---|
| `VITE_BMOB_SECRET_KEY` | Bmob 后端云密钥 |
| `VITE_BMOB_API_SAFE_CODE` | Bmob API 安全码 |
| `VITE_DEEPSEEK_API_KEY` | DeepSeek AI 通知生成 |
| `VITE_COS_SECRET_ID` | 腾讯云 COS（文件存储） |
| `VITE_COS_SECRET_KEY` | 腾讯云 COS（文件存储） |

## 数据模型

### Category（分类）
`name`, `value`, `icon`, `color`, `sortOrder`, `isActive`
内置类型: `zongce`, `baoyan`, `activity`, `course`, `homework`, `other`, `test`
默认不显示 `test` 类型，需在设置页开启。

### Notification（通知）
`title`, `content`(HTML), `type`, `sourceGroup`, `sourcePerson`, `originalLink`, `priority`(0-3), `tags`, `status`(active/archived), `deleted`, `deletedAt`

通知在 Bmob 的 `Notifications` 表中。字段名用 `lowerCamelCase`。

### File（文件注册表）
`name`, `url`, `mimeType`, `size`, `uploader`(Pointer), `usedBy`(Array)

### Favorite（收藏）
`user`(Pointer), `notification`(Pointer)

### Mission（任务）
`id`(mission-xxx 客户端 ID), `title`, `description`, `createdBy`, `status`, `roles[]`, `nodes[]`, `edges[]`, `assignments[]`, `customFields[]`, `version`

Bmob 字段：`missionId`(客户端 ID), `title`, `description`, `status`, `version`, `layoutData`(JSON 字符串), `deletedAt`, `pendingSync`
认领数据分离在 `MissionAssignmen` 表（注意表名少了个 t——Bmob 表名就是如此）。

## 项目结构

```
src/
├── main.js                 # Vue 应用入口 (createApp + Pinia + Router)
├── App.vue                 # 根组件
├── style.css               # Tailwind 入口
├── api/                    # Bmob API 封装层
│   ├── bmob.js             # Bmob SDK 初始化（读取 .env）
│   ├── notification.js     # 通知 CRUD（Notifications 表）
│   ├── category.js         # 分类 CRUD
│   ├── mission.js          # 任务 CRUD（ID 映射表 + layoutData JSON 序列化）
│   ├── user.js             # 用户认证 + 角色管理（_User + UserRoles 表）
│   ├── cos.js              # 腾讯云 COS 前端直传
│   ├── file.js             # 文件注册表
│   ├── favorite.js         # 收藏 CRUD
│   └── tauri.js            # [Tauri] Bridge — invoke() 封装，浏览器降级
├── components/
│   ├── WgEditor.vue/       # wangEditor V5 封装
│   │   ├── custom-menus.js # Mermaid/音频/文件 自定义按钮
│   │   └── mermaid-plugin.js # slate 元素注册（自定义 void 元素）
│   ├── MermaidManager.vue  # Mermaid 管理对话框（查看/编辑/删除所有图中的图）
│   ├── NotificationForm.vue # 通知编辑表单
│   ├── AiGenerator.vue     # DeepSeek AI 生成通知内容
│   ├── mission/            # 任务 DAG 组件树
│   │   ├── GraphCanvas.vue # SVG DAG 画布（缩放/平移/拖拽）
│   │   ├── NodeCard.vue    # 节点卡片（状态/进度/达标/多人完成记录）
│   │   ├── EdgeLine.vue    # SVG 贝塞尔依赖边
│   │   ├── GraphControls.vue # 缩放/适配/布局按钮
│   │   ├── ProgressBar.vue # 整体进度条
│   │   ├── StatusBadge.vue # 状态徽章
│   │   └── DetailPanel.vue # 点击节点弹出的详情/编辑/评论面板
│   ├── PdfPreview.vue      # PDF 预览（pdfjs-dist Worker 方式）
│   ├── Lightbox.vue        # 图片灯箱（点击放大）
│   └── ...
├── views/
│   ├── HomeView.vue        # 首页通知列表（分类 Tab + 搜索 + 分页）
│   ├── DetailView.vue      # 通知详情（Mermaid/PDF/图片/灯箱渲染）
│   ├── AdminView.vue       # 通知管理后台（CRUD + 回收站）
│   ├── SettingsView.vue    # 设置页（调试模式 + 测试通知开关 + 关于页入口）
│   ├── LoginView.vue       # 登录/注册
│   ├── FavoritesView.vue   # 收藏列表
│   ├── CategoryManagerView.vue # 分类管理
│   ├── AboutView.vue       # 项目关于页（业务模块分组展示）
│   ├── LabMockNotification.vue # 实验室 - 模拟通知生成
│   └── mission/
│       ├── MissionListView.vue  # 任务卡片列表（进度条 + 角色）
│       ├── MissionGraphView.vue # DAG 主视图（核心，含编辑/执行模式切换）
│       └── MissionStatsView.vue # 任务统计看板
├── stores/                 # Pinia 状态管理（全部 Options API 风格）
│   ├── notification.js     # notificationStore（纯 Bmob 云端）
│   ├── mission.js          # missionStore（localStorage 优先 + Bmob 防抖双写）
│   ├── user.js             # userStore（Bmob.User 封装）
│   ├── favorite.js         # favoriteStore（纯 Bmob 云端）
│   └── sync.js             # [Tauri] syncStore（Bmob→SQLite 同步状态）
├── types/
│   └── mission.js          # JSDoc @typedef 类型定义 + 工厂函数 + DEFAULT_PERMISSIONS
├── utils/
│   ├── mermaid-token.js    # Mermaid Token/Map 分离核心（parseMermaid / mergeMermaid）
│   ├── constants.js        # PRIORITY / DEFAULT_CATEGORIES / PAGE_SIZE
│   ├── mission-presets.js  # 10 个调试预设（含图结构）
│   └── ai-mission-parser.js # DeepSeek AI 生成任务 JSON 解析
├── router/
│   └── index.js            # 路由定义 + beforeEach 守卫（登录/管理员检查）

# 根目录其他内容
├── src-tauri/               # Tauri 桌面端（Rust + tauri v2）
│   ├── src/
│   │   ├── lib.rs           # 入口：插件注册 + 托盘 + 快捷键
│   │   ├── main.rs          # Windows 入口
│   │   ├── tray.rs          # 系统托盘
│   │   ├── commands.rs      # 8 个 Tauri Commands
│   │   ├── db.rs            # SQLite 离线缓存
│   │   ├── sync.rs          # Bmob REST API 同步引擎
│   │   └── notify.rs        # 桌面通知封装
│   ├── tauri.conf.json      # 窗口配置/权限
│   ├── capabilities/        # 权限声明
│   └── icons/               # 应用图标
├── dev_tools/              # 开发辅助工具
│   ├── patch-pdfjs.cjs     # postinstall 脚本：patch pdfjs-dist Worker
│   ├── create-test-notification.cjs # 创建测试通知（Node 脚本）
│   └── create-test-mission.cjs      # 创建测试任务（Node 脚本）
├── mcp-servers/            # MCP 服务器
│   ├── filesystem/         # 自定义文件系统 MCP Server（Node.js）
│   └── write-file/         # 文件写入 MCP Server（Python）
├── plan/                   # 设计文档和计划
│   ├── 任务系统/           # 任务系统实施规划 + 设计文档
│   ├── 每日资讯/           # 每日资讯功能设计
│   ├── Tauri/              # Tauri 桌面端计划
│   └── ...                 # 其他设计记录
└── index.html              # Vite 入口 HTML
```

## 架构详解

### 应用初始化流程

```
main.js:
  createApp(App)
    → app.use(createPinia())    # 注册 Pinia
    → app.use(router)           # 注册 Vue Router（Hash 模式）
    → app.mount('#app')

api/bmob.js:
  Bmob.initialize(SECRET_KEY, API_SAFE_CODE)  # 全局单例

router/index.js:
  beforeEach 守卫 → 检查登录状态 / 管理员角色
    - requiresAuth → 未登录跳转 /login
    - requiresAdmin → 非管理员跳转 /
    - guest → 已登录跳转 /
```

### 用户认证与角色

用户系统通过 Bmob 内建的 `_User` 表 + 自定义 `UserRoles` 表实现：

```
登录 → Bmob.User.login() → 从 UserRoles 表查角色 → 写入 localStorage('bmob_user_role')
getCurrentUser() → Bmob.User.current() + localStorage 角色兜底
isAdmin() → role === 'admin' || username === 'admin'
```

`UserRoles` 表字段：`userId`, `username`, `role`。角色值：`user`（普通）、`admin`（管理员）。

### 路由

| 路径 | 组件 | 权限 |
|---|---|---|
| `/` | HomeView | 需登录 |
| `/detail/:id` | DetailView | 需登录 |
| `/missions` | MissionListView | 需登录 |
| `/mission/:id` | MissionGraphView | 需登录 |
| `/mission/:id/stats` | MissionStatsView | 需登录 |
| `/favorites` | FavoritesView | 需登录 |
| `/settings` | SettingsView | 需登录 |
| `/about` | AboutView | 需登录 |
| `/admin` | AdminView | 需登录 + 管理员 |
| `/admin/categories` | CategoryManagerView | 需登录 + 管理员 |
| `/login` | LoginView | 仅访客 |
| `/lab/mock-notification` | LabMockNotification | 需登录 |

### Store 数据流模式

项目中有 **两种截然不同的数据流模式**：

| 模式 | Store | 持久化 | 说明 |
|---|---|---|---|
| **纯云端** | notification, category, favorite | Bmob SDK 直接读写 | API 层直接调 Bmob.Query，store 只做状态缓存 |
| **本地优先 + 云端双写** | mission | localStorage 即时写入 + Bmob 防抖同步 | 离线可用，Bmob 作为持久化 + 多设备同步层 |

#### 通知数据流（纯云端）
```
Bmob.Query(Notifications) → notificationStore.fetchList() → View 渲染
用户操作 → notificationStore action → API 层 → Bmob SDK → 更新 store
```

#### 任务数据流（本地优先 + 云端双写）
```
用户操作 → missionStore action
            ├── 即时写入 localStorage（响应式）
            ├── 更新 Pinia state → View 渲染
            └── 防抖 800ms → _saveToBmob() → Bmob SDK
加载时: Bmob 优先 → 失败则 localStorage 兜底
```

### Bmob API 层模式

所有 Bmob 操作统一通过 `src/api/bmob.js` 初始化的 SDK 实例。每个数据表对应一个 API 文件：

- **通知/分类/收藏**：直接 CRUD，字段与 Bmob 表一一对应
- **任务 (Mission)**：独特模式 — 客户端 ID (`mission-xxx`) 与 Bmob objectId 分离，通过 `missions:idmap` localStorage 映射表关联。`layoutData` 以 JSON 字符串存储在单字段中，避免拆分表

**通知 API 关键模式**（`src/api/notification.js`）：
- `getNotifications()` 使用 `deleted != true` 过滤已删除
- `showTest` 参数控制是否显示 `test` 类型的通知
- `normalizeNotification()` 将 Bmob 字段映射到内部字段（objectId → id）
- 软删除：`deleteNotification()` 设置 `deleted=true` + `deletedAt`
- 永久删除：`permanentlyDeleteNotification()` 调用 `q.destroy()`
- 30 天自动清理：`cleanExpiredTrash()` 由 UI 触发

**任务 API 关键模式**（`src/api/mission.js`）：
- 命名约定：`missionId` 字段存储客户端 ID，`objectId` 由 Bmob 自动生成
- ID 映射表 `missions:idmap`：client ID → Bmob objectId 的双向映射
- `layoutData` 序列化：`{ nodes, edges, roles, customFields, reminders }` 打包到一个字段
- `normalizeMission()` / `normalizeMissionIndexItem()` 反序列化
- `syncAssignments()` 全量比对：删除云端多余、新增/更新本地差异

### 任务系统（DAG）

核心实现文件链：

```
src/types/mission.js         → JSDoc 类型 + 工厂函数 + DEFAULT_PERMISSIONS
src/stores/mission.js        → 所有 CRUD + 权限判定 + Bmob 同步
src/api/mission.js           → Bmob 通信层（ID 映射/JSON 序列化）
src/components/mission/       → 渲染组件树
```

**类型定义**（`src/types/mission.js`）：
- 全部用 JSDoc `@typedef`，无 TypeScript
- 工厂函数：`createMission()`, `createTaskNode()`, `createEdge()`, `createRole()`
- `shortId()` 生成 8 位随机 ID
- `DEFAULT_PERMISSIONS` 按角色名匹配：executor/reviewer/approver/admin/observer

**权限系统 — 三步判定法**（mission store 中的核心逻辑）：
1. **管理员免检**：`adminBypass` 开关控制，默认关闭
2. **节点级白名单**：`allowedOperators`(角色) + `allowedUsers`(用户)
3. **角色级权限**：角色名称 → 自动匹配 `DEFAULT_PERMISSIONS`，名称不匹配 fallback 到 observer

**编辑模式 vs 执行模式**：
- 编辑模式：CRUD 全开，状态转换无限制
- 执行模式：隐藏 CRUD 按钮，状态转换按角色权限过滤

**循环检测**（`_wouldCreateCycle()`）：BFS 从 target 出发检查是否能到达 source。

**复合完成规则**：Node 支持 `single` / `count` / `all` 三种完成模式，由 `completionRule` 控制。

### Mermaid 数据分离方案

核心文件：`src/utils/mermaid-token.js`

```
编辑器内:    [[!mermaid_abc123]]  ← 纯文本 Token（Obsidian 风格双链）
数据层:      Map { id → { code, title } }  ← 独立于编辑器，兼容旧 { id: "原始code" }
保存时:      mergeMermaid() → [[!id]] 替换为 <div data-mermaid="CODE">（HTML 实体编码）
加载时:      parseMermaid() → <div data-mermaid> 替换为 [[!id]] Token
详情页:      querySelectorAll('[data-mermaid]') → mermaid.render() → SVG
```

辅助函数：`autoFixMermaidQuotes()` 为中文括号内容自动加引号，`getTitle()` 获取显示标题，`extractUsedIds()` 收集所有被引用的 ID。

### wangEditor 封装架构

`WgEditor.vue/` 是对 wangEditor V5 的 Vue 封装：

- **`custom-menus.js`**：注册三个自定义菜单按钮（Mermaid 插入、音频插入、文件插入）
- **`mermaid-plugin.js`**：注册 slate 自定义 void 元素（Mermaid 占位块），在编辑器中显示为灰色不可编辑块
- 编辑器内容模型为 HTML（Bmob 存储 HTML 格式）
- 内嵌媒体（图片/音频/视频/PDF）直接以 HTML 标签嵌入编辑器内容

### 详情页渲染链路

`DetailView.vue` 处理通知内容的最终渲染：

1. 从 Bmob 获取通知 HTML 内容
2. `parseMermaid(html)` → 将 `<div data-mermaid>` 替换回 Token
3. 组件通过 `v-html` 渲染 HTML
4. `onMounted` 钩子执行 `mermaid.run()` 渲染所有流程图
5. 图片点击 → `Lightbox.vue` 灯箱
6. PDF 链接 → `PdfPreview.vue`（使用 pdfjs-dist Worker）
7. 调试模式：显示 HTML 源码 / Mermaid 映射表

## 删除策略（Recycle Bin）

所有删除操作使用软删除。

| 规则 | 说明 |
|---|---|
| **软删除** | 数据从主列表移除，标记 `deletedAt`/`deleted=true` |
| **30 天自动清理** | 回收站中超过 30 天的条目自动永久删除 |
| **手动清空** | 用户可手动清空回收站（含确认对话框） |
| **恢复** | 回收站条目可一键恢复到主列表 |

通知系统：Bmob 字段 `deleted=true` + `deletedAt`，永久删除用 `Bmob.Query().destroy()`
任务系统：localStorage 回收站索引 `missions:recycle`，数据保留在原键（mission:{id}）

## 编码约定

- **文件名**：kebab-case（如 `notification-card.vue`）
- **组件名**：PascalCase（如 `NotificationCard.vue`）
- **API 函数**：camelCase（如 `getNotifications()`）
- **中文 UI**，代码注释用中文
- **JSDoc 类型注释**：mission 系统使用 JSDoc `@typedef` 代替 TypeScript
- **Pinia Store 风格**：全部使用 Options API（`defineStore` 传入对象，非 setup 函数）
- **每个原子级修改后 git commit**，遵循 Angular 提交规范
- **删除操作必须软删除**：数据移入回收站而非永久删除
- **路径别名 `@`** 映射到 `src/`，所有 import 优先使用（如 `import Bmob from '@/api/bmob'`）

## 关键 API 模式速查

### 通知 API
```js
// 列表（支持分类/搜索/分页/测试开关）
getNotifications({ type, search, page, pageSize, showTest }) → { data, total }

// CRUD
getNotification(id) → 单条
createNotification(data) → Bmob result
updateNotification(id, data) → Bmob result

// 回收站
deleteNotification(id) → 软删除
restoreNotification(id) → 恢复
getTrashNotifications() → 回收站列表
permanentlyDeleteNotification(id) → 真删除
cleanExpiredTrash() → 清理 30 天前
```

### 任务 API
```js
// 索引
fetchMissionIndex() → 概要列表
fetchMission(missionId) → 完整任务（按 missionId 查，objectId 兜底）

// 持久化
createMission(mission) → 新建到 Bmob
saveMission(missionId, partialData) → 更新
softDeleteMission(missionId) → 设 deletedAt
hardDeleteMission(missionId) → 真删除

// 认领
fetchAssignments(bmobObjectId) → 认领列表
syncAssignments(bmobObjectId, localAssignments) → 全量同步
getUserMissions(userId) → 用户参与的任务
```

## 计划文档

持续规划和设计文档见：
- [plan/任务系统/PLAN-AI.md](plan/任务系统/PLAN-AI.md) — AI 实施路线（P0-P4）
- [plan/任务系统/PLAN-DESIGN.md](plan/任务系统/PLAN-DESIGN.md) — 概念设计 v3.2
- [plan/任务系统/INTEGRATION-WITH-NOTIFICATION.md](plan/任务系统/INTEGRATION-WITH-NOTIFICATION.md) — 通知系统集成方案
- [plan/每日资讯/](plan/每日资讯/) — 每日资讯功能设计
- [plan/Tauri/](plan/Tauri/) — Tauri 桌面端计划
