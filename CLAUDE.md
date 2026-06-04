# 通知聚合器 — 项目文档

## 项目概述

大学微信通知聚合器。将分散在微信群中的通知聚合到一个网页中，支持分类浏览、富文本编辑（含内嵌媒体）、小范围分享。

## 架构决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 构建工具 | Vite | 极快 HMR，纯静态输出 |
| 前端框架 | Vue 3 + Composition API | 中文社区最大，文档齐全 |
| CSS | Tailwind CSS v3 | 移动端优先，响应式内建 |
| 状态管理 | Pinia | Vue 3 官方推荐，1KB 大小 |
| 路由 | Vue Router 4 | 配合 Vue 3 的路由方案 |
| 后端即服务 | LeanCloud 国内版 (leancloud.cn) | 国内节点，纯前端 SDK，内置 ACL |
| 富文本编辑器 | Tiptap + @tiptap/vue-3 | 基于 ProseMirror，WYSIWYG，Vue 3 原生支持 |
| 部署 | GitHub Pages (主力) + Gitee Pages (国内加速) | 双推方案 |

### 关键设计思路

- **纯前端 SPA + BaaS**：无需自建服务器，数据层由 LeanCloud 提供，前端直连 SDK
- **富文本内容内嵌媒体**：图片/音频/视频/PDF 全部嵌入在 Tiptap HTML 内容中，不设独立的附件列表
- **File 注册表**：维护文件名 → CDN URL 的映射，渲染时自动替换，方便未来迁移
- **ACL 权限**：登录用户可读，管理员可写，未登录不可见

## 数据模型

### Category（分类）
`name`, `value`, `icon`, `color`, `sortOrder`, `isActive`

### Notification（通知）
`title`, `content`(HTML), `type`(引用Category), `sourceGroup`, `sourcePerson`, `originalLink`, `priority`(0-3), `tags`, `status`(active/archived)

### File（文件注册表）
`name`, `url`, `mimeType`, `size`, `uploader`(Pointer), `usedBy`(Array)

### Favorite（收藏）
`user`(Pointer), `notification`(Pointer)

### Todo（Phase 5+）
`notification`(Pointer), `content`, `sortOrder`, `createdBy`

### TodoProgress（Phase 5+）
`todo`(Pointer), `user`(Pointer), `isCompleted`, `completedAt`

## 项目结构

```
notifications-aggregator/
├── .github/workflows/deploy.yml
├── src/
│   ├── api/            # LeanCloud API 封装
│   │   ├── leancloud.js
│   │   ├── notification.js
│   │   ├── category.js
│   │   ├── favorite.js
│   │   ├── file.js
│   │   └── user.js
│   ├── components/     # Vue 组件
│   │   ├── AppHeader.vue
│   │   ├── CategoryNav.vue
│   │   ├── NotificationCard.vue
│   │   ├── NotificationDetail.vue
│   │   ├── RichEditor.vue (含 Toolbar + 自定义节点)
│   │   ├── NotificationForm.vue
│   │   ├── SearchBar.vue
│   │   ├── TagFilter.vue / TagInput.vue
│   │   ├── LoginForm.vue
│   │   ├── PriorityBadge.vue
│   │   └── ConfirmDialog.vue
│   ├── views/          # 页面视图
│   │   ├── HomeView.vue
│   │   ├── DetailView.vue
│   │   ├── FavoritesView.vue
│   │   ├── AdminView.vue
│   │   ├── CategoryManagerView.vue
│   │   └── LoginView.vue
│   ├── router/index.js
│   ├── stores/         # Pinia 状态
│   │   ├── notification.js
│   │   ├── user.js
│   │   ├── favorite.js
│   │   └── editor.js
│   └── utils/          # 工具函数
│       ├── constants.js
│       ├── helpers.js
│       └── media.js
├── PLAN.md             # 进度跟踪（可监视）
├── CLAUDE.md           # 本文件
├── README.md           # 项目说明 + 数据迁移方案
├── 项目说明-人类草稿.md
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览构建结果
```

## 编码约定

- 文件名：kebab-case（如 `notification-card.vue`）
- 组件名：PascalCase（如 `NotificationCard.vue`）
- API 函数：camelCase（如 `getNotifications()`）
- 中文 UI，代码注释用中文
- 每个原子级修改后记得 git commit，遵循 Angular 提交规范

## 实施阶段

见 [PLAN.md](PLAN.md)
