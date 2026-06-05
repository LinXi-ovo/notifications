# 通知聚合器 — 项目文档

## 项目概述

大学微信通知聚合器。将分散在微信群中的通知聚合到一个网页中，支持分类浏览、富文本编辑（含内嵌媒体）、小范围分享。

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

## Mermaid 数据分离方案

```
编辑器内:    [[!mermaid_abc123]]  ← 纯文本 Token
数据层:      Map { id → { code, title } }  ← 独立于编辑器
保存时:      mergeMermaid() → [[!id]] 替换为 <div data-mermaid="CODE">
加载时:      parseMermaid() → <div data-mermaid> 替换为 [[!id]]
详情页:      querySelectorAll('[data-mermaid]') → mermaid.render() → SVG
```

关键文件：
- `src/utils/mermaid-token.js` — parse/merge/autoFix 工具函数
- `src/components/MermaidManager.vue` — 管理对话框
- `src/components/WgEditor.vue` — 编辑器集成

## 项目结构

```
notifications-aggregator/
├── src/
│   ├── api/              # Bmob API 封装
│   ├── components/
│   │   ├── WgEditor.vue/         # wangEditor 封装
│   │   │   ├── custom-menus.js   # Mermaid/音频/文件 自定义按钮
│   │   │   └── mermaid-plugin.js # 备用 slate 元素注册
│   │   ├── MermaidManager.vue    # Mermaid 管理对话框
│   │   ├── NotificationForm.vue
│   │   ├── AiGenerator.vue       # DeepSeek AI 生成
│   │   └── ...
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── DetailView.vue        # Mermaid/PDF/图片渲染
│   │   ├── AdminView.vue
│   │   ├── SettingsView.vue      # 调试模式 + 测试通知开关
│   │   ├── LoginView.vue
│   │   └── ...
│   ├── router/index.js
│   ├── stores/
│   └── utils/
│       ├── constants.js
│       ├── mermaid-token.js      # Mermaid 数据分离核心
│       └── helpers.js
├── design/               # 设计文档
│   ├── mermaid.md
│   └── mermaid/encoding-safety.md
├── solution/             # 方案记录
│   └── pdf-preview-via-cos.md
├── plan/                 # 规划文档
│   ├── editor-data-strategy.md
│   └── reminder.md
├── dev_tools/            # 开发者工具
│   └── create-test-notification.cjs
├── PLAN.md
├── CLAUDE.md
└── README.md
```

## 已删除的旧文件

- `src/components/RichEditor.vue` — Tiptap 编辑器，已替换
- `src/components/RichEditor/` — 整个目录（Toolbar/MermaidNode/MermaidView）
- `src/components/MermaidEditor.vue` — 早期 Mermaid 对话框，已替换为 MermaidManager

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览构建结果
```

## 删除策略（Recycle Bin）

所有删除操作必须使用**软删除**，数据移入回收站而非永久删除。

| 规则 | 说明 |
|---|---|
| **软删除** | 删除时数据从主列表移除，但保持完整数据在存储中，标记删除时间 |
| **30 天自动清理** | 回收站中超过 30 天的条目自动永久删除（应用初始化时检查） |
| **手动一键删除** | 用户可手动清空回收站，此时弹出确认对话框，确认后永久删除 |
| **恢复** | 回收站中的条目可一键恢复到主列表 |

实现方式：
- 删除操作将条目 ID 从主索引移至回收站索引（如 `missions:recycle`）
- 完整数据保留在原存储键（如 `mission:{id}`）中
- 自动清理在 `fetchIndex` 或 Store 初始化时执行
- 回收站 UI 显示条目列表 + 删除时间 + 恢复/永久删除按钮

## 编码约定

- 文件名：kebab-case（如 `notification-card.vue`）
- 组件名：PascalCase（如 `NotificationCard.vue`）
- API 函数：camelCase（如 `getNotifications()`）
- 中文 UI，代码注释用中文
- 每个原子级修改后 git commit，遵循 Angular 提交规范

## 实施阶段

见 [PLAN.md](PLAN.md)
