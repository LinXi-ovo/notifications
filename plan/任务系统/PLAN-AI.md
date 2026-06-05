# 任务系统 — AI 实施规划

> 基于 [PLAN-DESIGN.md](./PLAN-DESIGN.md) 生成的实施计划，按 P0→P4 分阶段推进，每个里程碑后 git commit。

---

## 实施路线总览

```
P0 ──────── P1 ──────── P2 ──────── P3 ──────── P4
│           │           │           │           │
├ 数据模型   ├ 角色认领   ├ 内容编辑   ├ 自定义字段 ├ 催促提醒
├ 图渲染     ├ 状态变更   ├ JumpLink  ├ 评论线程   ├ 导入导出ZIP
├ CRUD       ├ 完成统计   ├ 角色审批   ├ 子图嵌套   ├ 图编辑器
├ 缩放拖拽   ├ 导入导出   │           ├ 权限校验   ├ 多端同步
│           │           │           ├ 完成统计   │
```

---

## P0 — 基础框架（当前阶段）

### M0: 数据模型定义
- 文件: `src/types/mission.js`
- 内容: JSDoc 类型定义 (Mission / TaskNode / Edge / Role / Assignment / CompletionRecord / Reminder / Permission / CustomField / Comment / SubMission / JumpLink)
- 产出: 数据模型的规范注释，供后续模块引用

### M1: Mission Pinia Store
- 文件: `src/stores/mission.js`
- 功能:
  - `missions` — Mission 列表索引
  - `currentMission` — 当前加载的 Mission
  - `loadMission(id)`, `createMission(data)`, `updateMission(patches)`, `deleteMission(id)`
  - `addNode(data)`, `removeNode(id)`, `updateNode(id, patch)`
  - `addEdge(src, tgt, label)`, `removeEdge(id)`
  - `addRole(data)`, `removeRole(id)`, `updateRole(id, patch)`
  - 数据存储: localStorage 读写 / JSON 序列化

### M2: 图渲染（dagre + SVG 只读）
- 安装依赖: `dagre`
- 文件:
  - `src/components/mission/GraphCanvas.vue` — 缩放/平移容器
  - `src/components/mission/NodeCard.vue` — 节点卡片（色带/状态/进度）
  - `src/components/mission/EdgeLine.vue` — SVG 依赖边
  - `src/components/mission/GraphControls.vue` — 缩放控制按钮
  - `src/components/mission/ProgressBar.vue` — 可复用进度条

### M3: 路由与页面
- 修改 `src/router/index.js` — 添加 `/missions`、`/mission/:id` 路由
- 创建:
  - `src/views/mission/MissionListView.vue` — 卡片式任务列表
  - `src/views/mission/MissionGraphView.vue` — DAG 主视图

### M4: 基础导入导出（JSON 单文件）
- 功能:
  - `exportMission(id)` → 下载 JSON
  - `importMission(json)` → 冲突检测 + 导入
  - 导入冲突策略: 默认跳过，用户可选覆盖/重命名

---

## P1 — 核心操作

### M5: 角色认领
- 文件: `src/components/mission/RoleClaimPanel.vue`
- 功能: 自由认领(free) 即时生效，输入口令认领(password)
- store 扩展: `claimRole()`, `claimRoleWithPassword()`

### M6: 状态变更 + 完成统计
- 文件: `src/components/mission/DetailPanel.vue`, `src/components/mission/StatusBadge.vue`, `src/components/mission/CompletionList.vue`
- 功能: 节点详情面板、状态转换 UI、完成模式(single/count/all)
- store 扩展: `changeNodeStatus()`, `markComplete()`

### M7: 角色过滤 + 侧栏统计
- 文件: `src/components/mission/RoleFilter.vue`
- 功能: 按角色过滤节点、角色统计摘要

---

## P2 — 内容与协作

### M8: 节点内容编辑
- 复用 WgEditor，节点内容支持富文本编辑
- 路由: `/mission/:id/node/:nodeId`

### M9: JumpLink 渲染
- 文件: `src/components/mission/JumpLinkRenderer.vue`
- 支持 `[[node:id]]` `[[mission:id]]` `[[notif:id]]` 解析跳转

### M10: 角色审批 + 委派
- 文件: `src/components/mission/ClaimApprovalList.vue`, `src/components/mission/PasswordClaimDialog.vue`, `src/components/mission/DelegateRoleDialog.vue`
- 认领审核流 (approval)、口令认领 (password)、管理员委派 (delegated)

### M11: 节点级操作权限
- store 扩展: `checkNodeOperation()` → UI 禁用/启用
- allowedOperators + allowedUsers 白名单校验

---

## P3 — 扩展系统

### M12: 自定义字段
- 文件: `src/components/mission/CustomFieldForm.vue`, `src/components/mission/CustomFieldEditor.vue`
- Mission 级 Schema 定义 → Node 级值存储 → 权限可见性控制
- 10 种字段类型 + visibleToRoles/editableByRoles

### M13: 评论线程 + @提及
- 文件: `src/components/mission/CommentThread.vue`
- store: `useMissionCommentStore`
- Markdown 评论、@提及、回复线程、附件

### M14: 子图嵌套
- 文件: `src/components/mission/SubMissionViewer.vue`, `src/components/mission/BreadcrumbNav.vue`, `src/components/mission/SubMissionSummary.vue`
- 最多 3 层嵌套、状态聚合、独立导入导出

### M15: 权限系统全面接入
- 三步判定法实现: 管理员免检 → 节点级白名单 → 角色级权限
- 状态转换 UI 按权限禁用/隐藏

### M16: 完成统计面板
- store: `useMissionStatsStore`
- 全局进度 / 按角色聚合 / 节点完成明细

---

## P4 — 高级功能

### M17: 催促提醒
- 文件: `src/components/mission/ReminderDialog.vue`
- store: `useMissionReminderStore`
- 自动规则 (deadline/idle/status-check) + 手动催促 + @mention 联动

### M18: ZIP 导入导出
- 多文件 ZIP 格式（含子图、评论分离）
- 冲突策略选择 UI (跳过/覆盖/重命名/合并)

### M19: 图编辑器模式
- 可视化创建/删除节点和边
- 拖拽添加新节点、连线

### M20: 多端同步
- Bmob 文件存储 / WebDAV 同步适配器

---

## 文件清单（完整）

### 类型定义
- `src/types/mission.js`

### Stores
- `src/stores/mission.js` — 核心 CRUD + 角色认领 + 权限判定
- `src/stores/mission-comment.js` — 评论 (P3)
- `src/stores/mission-reminder.js` — 提醒 (P4)
- `src/stores/mission-stats.js` — 统计 (P3)

### 视图
- `src/views/mission/MissionListView.vue` — 任务列表
- `src/views/mission/MissionGraphView.vue` — DAG 主视图
- `src/views/mission/MissionNodeDetailView.vue` — 节点详情编辑 (P2)
- `src/views/mission/MissionSettingsView.vue` — 任务设置 (P3)
- `src/views/mission/AssignmentManageView.vue` — 认领管理 (P2)
- `src/views/mission/MissionStatsView.vue` — 统计面板 (P3)
- `src/views/mission/MissionImportView.vue` — 导入页 (P0)

### 组件
- `src/components/mission/NodeCard.vue` — 节点卡片
- `src/components/mission/EdgeLine.vue` — SVG 边
- `src/components/mission/GraphCanvas.vue` — 画布容器
- `src/components/mission/GraphControls.vue` — 缩放控制
- `src/components/mission/ProgressBar.vue` — 进度条
- `src/components/mission/RoleFilter.vue` — 角色过滤 (P1)
- `src/components/mission/DetailPanel.vue` — 详情面板 (P1)
- `src/components/mission/StatusBadge.vue` — 状态徽章 (P1)
- `src/components/mission/StatusTransition.vue` — 状态变更 (P1)
- `src/components/mission/CompletionList.vue` — 完成人列表 (P1)
- `src/components/mission/CommentThread.vue` — 评论 (P3)
- `src/components/mission/CustomFieldForm.vue` — 字段渲染 (P3)
- `src/components/mission/CustomFieldEditor.vue` — 字段编辑器 (P3)
- `src/components/mission/ImportExport.vue` — 导入导出 (P0)
- `src/components/mission/ReminderDialog.vue` — 提醒 (P4)
- `src/components/mission/BreadcrumbNav.vue` — 面包屑 (P3)
- `src/components/mission/SubMissionViewer.vue` — 子图 (P3)
- `src/components/mission/SubMissionSummary.vue` — 子图摘要 (P3)
- `src/components/mission/RoleClaimPanel.vue` — 认领面板 (P1)
- `src/components/mission/ClaimApprovalList.vue` — 审批列表 (P2)
- `src/components/mission/PasswordClaimDialog.vue` — 口令 (P2)
- `src/components/mission/DelegateRoleDialog.vue` — 委派 (P2)
- `src/components/mission/JumpLinkRenderer.vue` — 跳转 (P2)
- `src/components/mission/MissionSettings.vue` — 设置 (P3)

### 修改文件
- `src/router/index.js` — 添加 mission 路由
- `src/App.vue` — 添加导航入口

---

## 存储策略

```
localStorage:
  missions:index        → Mission 概要索引 [{ id, title, status, updatedAt }]
  mission:{id}          → 完整 Mission JSON（含 nodes/edges/roles）

导入导出:
  单文件 JSON: 下载 mission-{id}.json
  ZIP 多文件: 含子图、评论分离（P4）
```

## 与通知系统的集成点

| 集成点 | 说明 | 阶段 |
|---|---|---|
| 复用 WgEditor | TaskNode.content 富文本编辑 | P2 |
| 复用 UserStore | 角色认领身份来源 | P0 |
| `[[notif:id]]` | 通知引用跳转 | P2 |
| 独立路由 `/missions/*` | 不干扰现有通知路由 | P0 |
| 独立数据通道 | JSON 文件存储，不走 Bmob | P0 |
