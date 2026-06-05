# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 通知聚合器 — 项目文档

## 项目概述

大学微信通知聚合器。将分散在微信群中的通知聚合到一个网页中，支持分类浏览、富文本编辑（含内嵌媒体）、小范围分享、DAG 任务追踪。

## 架构决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 构建工具 | Vite | 极快 HMR，纯静态输出 |
| 前端框架 | Vue 3 + Composition API | 中文社区最大，文档齐全 |
| CSS | Tailwind CSS v4 | 移动端优先，响应式内建 |
| 状态管理 | Pinia | Vue 3 官方推荐，1KB 大小 |
| 路由 | Vue Router 4 | 配合 Vue 3 的路由方案 |
| 后端即服务 | Bmob 后端云 (bmob.cn) | 国内节点，Parse 衍生，内置用户系统 + ACL |
| 富文本编辑器 | **wangEditor V5** | 原生中文，HTML 内容模型，替换了 Tiptap |
| 流程图 | **Mermaid + Token/Map 数据分离** | 编辑器内纯文本占位 `[[!id]]`，详情页渲染 SVG |
| 文件存储 | 腾讯云 COS | 前端直传，图片自动压缩 |
| 部署 | Cloudflare Pages (主力) + GitHub Pages (备用) | 双线部署 |

### 关键设计思路

- **纯前端 SPA + BaaS**：无需自建服务器，数据层由 Bmob 提供，前端直连 SDK
- **富文本内容内嵌媒体**：图片/音频/视频/PDF 全部嵌入在 HTML 内容中
- **Mermaid Token/Map 分离**：编辑器只存 `[[!id]]` 占位符，独立 Map 存源代码，解耦渲染
- **File 注册表**：维护文件名 → COS URL 的映射
- **ACL 权限**：登录用户可读，管理员可写，未登录不可见
- **调试模式**：设置页开关，管理员可用，显示 HTML 源码、Mermaid 预设等
- **任务 DAG**：哈斯图渲染、编辑/执行双模式、角色名→权限自动映射

## 数据模型

### Category（分类）
`name`, `value`, `icon`, `color`, `sortOrder`, `isActive`
内置类型: `zongce`, `baoyan`, `activity`, `course`, `homework`, `other`, `test`
默认不显示 `test` 类型，需在设置页开启。

### Notification（通知）
`title`, `content`(HTML), `type`, `sourceGroup`, `sourcePerson`, `originalLink`, `priority`(0-3), `tags`, `status`(active/archived), `deadline`

### File（文件注册表）
`name`, `url`, `mimeType`, `size`, `uploader`(Pointer), `usedBy`(Array)

### Favorite（收藏）
`user`(Pointer), `notification`(Pointer)

### Mission（任务）
`id`(mission-xxx), `title`, `description`, `createdBy`, `status`, `roles[]`, `nodes[]`, `edges[]`, `assignments[]`, `customFields[]`, `version`

数据存储：**layoutData 大字段 JSON**（含 nodes/edges/roles/customFields），认领数据单独拆表 MissionAssignment。

## 项目结构

```
src/
├── api/                  # Bmob API 封装
│   ├── bmob.js           # Bmob SDK 初始化
│   ├── notification.js   # 通知 CRUD（Bmob 直连）
│   ├── category.js       # 分类 CRUD（Bmob 直连）
│   ├── mission.js        # 任务 CRUD（Bmob + ID 映射表）
│   ├── user.js           # 用户认证
│   ├── cos.js            # 腾讯云 COS 直传
│   ├── file.js           # 文件注册表
│   └── favorite.js       # 收藏（Bmob 直连）
├── components/
│   ├── WgEditor.vue/             # wangEditor 封装
│   │   ├── custom-menus.js       # Mermaid/音频/文件 自定义按钮
│   │   └── mermaid-plugin.js     # slate 元素注册
│   ├── MermaidManager.vue        # Mermaid 管理对话框
│   ├── NotificationForm.vue      # 通知编辑表单
│   ├── AiGenerator.vue           # DeepSeek AI 生成
│   ├── mission/                  # 任务系统组件树
│   │   ├── GraphCanvas.vue       # SVG DAG 画布（缩放/平移）
│   │   ├── NodeCard.vue          # 节点卡片（状态/进度/达标）
│   │   ├── EdgeLine.vue          # SVG 依赖边
│   │   ├── GraphControls.vue     # 缩放控制
│   │   ├── ProgressBar.vue       # 进度条
│   │   ├── StatusBadge.vue       # 状态徽章
│   │   └── DetailPanel.vue       # 节点详情面板
│   ├── PdfPreview.vue            # PDF 预览
│   ├── Lightbox.vue              # 图片灯箱
│   └── ...
├── views/
│   ├── HomeView.vue              # 首页通知列表
│   ├── DetailView.vue            # 通知详情（Mermaid/PDF/图片渲染）
│   ├── AdminView.vue             # 管理后台
│   ├── SettingsView.vue          # 设置页（调试模式 + 测试通知开关）
│   ├── LoginView.vue
│   ├── FavoritesView.vue
│   ├── CategoryManagerView.vue
│   ├── LabMockNotification.vue   # 实验室 - 模拟通知
│   └── mission/
│       ├── MissionListView.vue   # 任务卡片列表
│       └── MissionGraphView.vue  # DAG 主视图（核心）
├── stores/               # Pinia 状态管理
│   ├── notification.js   # notificationStore（纯 Bmob 云端）
│   ├── mission.js        # missionStore（localStorage + Bmob 双写）
│   ├── user.js           # userStore（Bmob.User 封装）
│   └── favorite.js       # favoriteStore（纯 Bmob 云端）
├── types/
│   └── mission.js        # 任务系统类型定义 + 工厂函数
├── utils/
│   ├── mermaid-token.js  # Mermaid Token/Map 分离核心
│   ├── constants.js      # 优先级/默认分类/分页
│   ├── mission-presets.js# 10 个调试预设
│   └── ai-mission-parser.js # AI 生成任务 JSON 解析器
└── router/index.js       # 路由配置 + 守卫
```

## 架构详解

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

### 任务系统（DAG）

核心实现文件链：
```
src/types/mission.js         → JSDoc 类型 + 工厂函数 + DEFAULT_PERMISSIONS
src/stores/mission.js        → 所有 CRUD + 权限判定 + Bmob 同步
src/api/mission.js           → Bmob 通信层（ID 映射/JSON 序列化）
src/components/mission/       → 渲染组件树
```

**权限系统 — 三步判定法**（mission store 中的核心逻辑）：
1. **管理员免检**：`adminBypass` 开关控制，默认关闭
2. **节点级白名单**：`allowedOperators`(角色) + `allowedUsers`(用户)
3. **角色级权限**：角色名称 → 自动匹配 `DEFAULT_PERMISSIONS`（executor/reviewer/approver/admin/observer），名称不匹配 fallback 到 observer

**编辑模式 vs 执行模式**：
- 编辑模式：CRUD 全开，状态转换无限制
- 执行模式：隐藏 CRUD 按钮，状态转换按角色权限过滤

### Mermaid 数据分离方案

```
编辑器内:    [[!mermaid_abc123]]  ← 纯文本 Token
数据层:      Map { id → { code, title } }  ← 独立于编辑器
保存时:      mergeMermaid() → [[!id]] 替换为 <div data-mermaid="CODE">
加载时:      parseMermaid() → <div data-mermaid> 替换为 [[!id]]
详情页:      querySelectorAll('[data-mermaid]') → mermaid.render() → SVG
```

## 开发命令

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器（Vite HMR）
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
```

注意：`npm install` 后自动执行 `postinstall` 脚本（patch pdfjs-dist）。

## 环境变量

复制 `.env.example` → `.env`：

| 变量 | 用途 |
|---|---|
| `VITE_BMOB_SECRET_KEY` | Bmob 后端云密钥 |
| `VITE_BMOB_API_SAFE_CODE` | Bmob API 安全码 |
| `VITE_DEEPSEEK_API_KEY` | DeepSeek AI 通知生成 |
| `VITE_COS_SECRET_ID` | 腾讯云 COS（文件存储） |
| `VITE_COS_SECRET_KEY` | 腾讯云 COS（文件存储） |

## 路由

| 路径 | 组件 | 权限 |
|---|---|---|
| `/` | HomeView | 需登录 |
| `/detail/:id` | DetailView | 需登录 |
| `/missions` | MissionListView | 需登录 |
| `/mission/:id` | MissionGraphView | 需登录 |
| `/favorites` | FavoritesView | 需登录 |
| `/settings` | SettingsView | 需登录 |
| `/admin` | AdminView | 需登录 + 管理员 |
| `/admin/categories` | CategoryManagerView | 需登录 + 管理员 |
| `/login` | LoginView | 仅访客 |
| `/lab/mock-notification` | LabMockNotification | 需登录 |

## 编码约定

- **文件名**：kebab-case（如 `notification-card.vue`）
- **组件名**：PascalCase（如 `NotificationCard.vue`）
- **API 函数**：camelCase（如 `getNotifications()`）
- **中文 UI**，代码注释用中文
- **JSDoc 类型注释**：mission 系统使用 JSDoc `@typedef` 代替 TypeScript
- **每个原子级修改后 git commit**，遵循 Angular 提交规范
- **删除操作必须软删除**：数据移入回收站而非永久删除

## 删除策略（Recycle Bin）

所有删除操作使用软删除。

| 规则 | 说明 |
|---|---|
| **软删除** | 数据从主列表移除，标记 `deletedAt`/`deleted=true` |
| **30 天自动清理** | 回收站中超过 30 天的条目自动永久删除 |
| **手动清空** | 用户可手动清空回收站（含确认对话框） |
| **恢复** | 回收站条目可一键恢复到主列表 |

通知系统：Bmob 字段 `deleted=true` + `deletedAt`，永久删除用 `Bmob.Query().destroy()`
任务系统：localStorage 回收站索引 `missions:recycle`，数据保留在原键

## 计划文档

任务系统的实施规划见：
- [plan/任务系统/PLAN-AI.md](plan/任务系统/PLAN-AI.md) — AI 实施路线（P0-P4）
- [plan/任务系统/PLAN-DESIGN.md](plan/任务系统/PLAN-DESIGN.md) — 概念设计 v3.2
- [plan/任务系统/INTEGRATION-WITH-NOTIFICATION.md](plan/任务系统/INTEGRATION-WITH-NOTIFICATION.md) — 通知系统集成方案
