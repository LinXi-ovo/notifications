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

## P0 — 基础框架（已全部完成）

### M0: 数据模型定义
- 文件: `src/types/mission.js`
- 内容: JSDoc 类型定义 (Mission / TaskNode / Edge / Role / Assignment / CompletionRecord / Reminder / Permission / CustomField / Comment / SubMission / JumpLink)
- 产出: 数据模型的规范注释，供后续模块引用

### M1: Mission Pinia Store
- 文件: `src/stores/mission.js`
- 功能: ✅ 已实现
  - `missions` — Mission 列表索引
  - `currentMission` — 当前加载的 Mission
  - `loadMission(id)`, `createMission(data)`, `updateMission(patches)`, `deleteMission(id)`
  - `addNode(data)`, `removeNode(id)`, `updateNode(id, patch)`
  - `addEdge(src, tgt, label)`, `removeEdge(id)`
  - `addRole(data)`, `removeRole(id)`, `updateRole(id, patch)`
  - 数据存储: localStorage 读写 / JSON 序列化 / Bmob 双写同步

### M2: 图渲染（dagre + SVG）
- 安装依赖: `dagre`
- 文件:
  - `src/components/mission/GraphCanvas.vue` — 缩放/平移容器
  - `src/components/mission/NodeCard.vue` — 节点卡片（色带/状态/进度/完成标记）
  - `src/components/mission/EdgeLine.vue` — SVG 依赖边
  - `src/components/mission/GraphControls.vue` — 缩放控制按钮
  - `src/components/mission/ProgressBar.vue` — 可复用进度条

### M3: 路由与页面
- 修改 `src/router/index.js` — 添加 `/missions`、`/mission/:id` 路由 ✅
- 创建:
  - `src/views/mission/MissionListView.vue` — 卡片式任务列表（含导入 UI）
  - `src/views/mission/MissionGraphView.vue` — DAG 主视图（含所有功能面板）

### M4: 基础导入导出（JSON 单文件）
- 功能: ✅ 已实现
  - `exportMission(id)` → 下载 JSON
  - `importMission(json)` → 冲突检测 + 导入
  - 导入冲突策略: 默认跳过，用户可选覆盖/重命名
  - UI 分布在 MissionListView（导入） 和 MissionGraphView（导出）

---

## P1 — 核心操作（已全部实现，部分 UI 合并）

### M5: 角色认领
- 功能: ✅ 已实现（UI 合并在 DetailPanel 和 MissionGraphView）
  - 自由认领(free) 即时生效 ✅
  - 输入口令认领(password) ✅（使用原生 prompt()）
  - store 扩展: `claimRole()`, `claimRoleWithPassword()` ✅

### M6: 状态变更 + 完成统计
- 功能: ✅ 已实现（UI 合并在 DetailPanel）
  - 节点详情面板 ✅
  - 状态转换 UI（编辑模式全量 + 执行模式按权限）✅
  - 完成模式(single/count/all) + 标记我已填写 ✅
  - 达标标记（count/all 满员前即可提示下游开始）✅
  - store 扩展: `changeNodeStatus()`, `markComplete()` ✅

### M7: 角色过滤 + 侧栏统计
- 功能: ❌ 未实现 — 无独立 RoleFilter 组件
  - 角色过滤节点功能未实现
  - 角色统计摘要未实现

---

## P2 — 内容与协作（部分实现）

### M8: 节点内容编辑
- 功能: ❌ 未实现
  - 原计划复用 WgEditor，节点内容支持富文本编辑
  - 路由: `/mission/:id/node/:nodeId`
  - 当前仅显示 `node.description` 纯文本，`node.content`(HTML) 字段未渲染

### M9: JumpLink 渲染
- 功能: 🔄 待实现
  - 支持 `[[node:id]]` `[[mission:id]]` `[[notif:id]]` 解析跳转
  - 类型定义和数据字段 (`jumpLinks`) 已存在，但缺少渲染组件

### M10: 角色审批 + 委派
- 功能: ✅ 已实现（UI 合并在 MissionGraphView 角色管理对话框）
  - 认领审核流 (approval) ✅
  - 口令认领 (password) ✅
  - 管理员委派 (delegated) ✅

### M11: 节点级操作权限
- 功能: ✅ 已实现
  - 三步判定法：管理员免检 → 节点级白名单 → 角色级权限
  - store 扩展: `checkNodeOperation()` → UI 禁用/启用
  - allowedOperators + allowedUsers 白名单校验

---

## P3 — 扩展系统（部分实现）

### M12: 自定义字段
- 功能: ✅ 已实现
  - `src/components/mission/CustomFieldForm.vue` — 字段值渲染
  - `src/components/mission/CustomFieldEditor.vue` — 字段 Schema 编辑
  - 可见性控制 (visibleToRoles/editableByRoles)

### M13: 评论线程 + @提及
- 功能: ✅ 已实现
  - `CommentThread.vue` + `useMissionCommentStore` (localStorage)
  - @提及、回复线程、附件
  - ⚠️ Markdown 格式未实现，当前为纯文本

### M14: 子图嵌套
- 功能: ❌ 未实现
  - 类型定义存在 (SubMission / SubMissionSummary)
  - NodeCard 显示子图角标（"包含子任务"）
  - 无 SubMissionViewer / BreadcrumbNav / SubMissionSummary 组件
  - 最深 3 层嵌套未实现

### M15: 权限系统全面接入
- 功能: ✅ 已实现
  - 三步判定法: 管理员免检 → 节点级白名单 → 角色级权限
  - 状态转换 UI 按权限禁用/隐藏
  - adminBypass 调试开关

### M16: 完成统计面板
- 功能: 🔀 已合并（MissionStatsView 已实现）
  - `src/views/mission/MissionStatsView.vue` — 全局进度统计
  - store 未独立为 `useMissionStatsStore`

---

## P4 — 高级功能（部分实现）

### M17: 催促提醒
- 功能: ✅ 已实现
  - `ReminderDialog.vue` + `useMissionReminderStore` (localStorage)
  - 手动提醒（发 comment 中的 @mention）
  - ⚠️ 自动规则 (deadline/idle/status-check) 未完整实现

### M18: ZIP 导入导出
- 功能: ❌ 未实现 — 当前仅支持 JSON 单文件

### M19: 图编辑器模式
- 功能: ⚠️ 基础可用 — 编辑模式下可增删节点/边，非可视化拖拽，通过按钮操作
  - 可视化拖拽添加、连线未实现

### M20: 多端同步
- 功能: ❌ 未实现 — 当前通过 Bmob 云端同步，WebDAV 等未支持

---

## 文件清单（完整）

> ⚠️ 实际实现中，许多"独立组件"的功能已合并到现有组件中，而非拆分为独立文件。
> 以下标记 `🔀 已合并` 表示 Store/组件内联实现，`❌ 未实现` 表示功能尚未开发。

### 类型定义
- `src/types/mission.js` ✅ 已实现

### Stores
- `src/stores/mission.js` ✅ 核心 CRUD + 角色认领 + 权限判定 + 导入导出
- `src/stores/mission-comment.js` ✅ 评论 (P3)
- `src/stores/mission-reminder.js` ✅ 提醒 (P4)
- `src/stores/mission-stats.js` ❌ 未实现 — 统计功能未分离为独立 Store

### 视图
- `src/views/mission/MissionListView.vue` ✅ 任务列表（含导入 UI）
- `src/views/mission/MissionGraphView.vue` ✅ DAG 主视图（含认领/审批/委派/导出 UI）
- `src/views/mission/MissionStatsView.vue` ✅ 统计面板
- `src/views/mission/MissionNodeDetailView.vue` ❌ 未实现 — 节点内容编辑未实现
- `src/views/mission/MissionSettingsView.vue` ❌ 未实现 — 无专门设置页
- `src/views/mission/AssignmentManageView.vue` 🔀 已合并 — 认领管理在 MissionGraphView 内联
- `src/views/mission/MissionImportView.vue` 🔀 已合并 — 导入在 MissionListView 内联

### 组件
| 组件 | 状态 | 备注 |
|---|---|---|
| `GraphCanvas.vue` | ✅ | 画布容器 (缩放/平移) |
| `NodeCard.vue` | ✅ | 节点卡片（含完成进度） |
| `EdgeLine.vue` | ✅ | SVG 边 |
| `GraphControls.vue` | ✅ | 缩放控制 |
| `ProgressBar.vue` | ✅ | 进度条 |
| `StatusBadge.vue` | ✅ | 状态徽章 |
| `DetailPanel.vue` | ✅ | 详情面板（含认领/状态转换/完成列表 UI） |
| `CustomFieldForm.vue` | ✅ | 字段渲染 (P3) |
| `CustomFieldEditor.vue` | ✅ | 字段编辑器 (P3) |
| `CommentThread.vue` | ✅ | 评论 (P3) |
| `ReminderDialog.vue` | ✅ | 提醒 (P4) |
| `RoleFilter.vue` | ❌ | 角色过滤侧栏 — 未实现 |
| `StatusTransition.vue` | 🔀 已合并 | 状态变更按钮组在 DetailPanel 内联 |
| `CompletionList.vue` | 🔀 已合并 | 完成人列表在 NodeCard+DetailPanel 内联 |
| `ImportExport.vue` | 🔀 已合并 | 导入导出在 store + MissionListView/MissionGraphView 内联 |
| `RoleClaimPanel.vue` | 🔀 已合并 | 认领面板在 DetailPanel+MissionGraphView 内联 |
| `ClaimApprovalList.vue` | 🔀 已合并 | 审批列表在 MissionGraphView 内联 |
| `PasswordClaimDialog.vue` | 🔀 已合并 | 口令认领用原生 `prompt()`，无独立对话框 |
| `DelegateRoleDialog.vue` | 🔀 已合并 | 委派 UI 在 MissionGraphView 内联 |
| `JumpLinkRenderer.vue` | 🔄 待实现 | `[[node:id]]` `[[mission:id]]` `[[notif:id]]` 渲染 |
| `BreadcrumbNav.vue` | ❌ | 子图面包屑 — 未实现 |
| `SubMissionViewer.vue` | ❌ | 子图查看 — 未实现 |
| `SubMissionSummary.vue` | ❌ | 子图摘要 — 未实现 |
| `MissionSettings.vue` | ❌ | 任务设置面板 — 未实现 |

> **说明**：`🔀 已合并` 表示功能已实现并可用，但代码合并在其他组件中，未抽离为独立文件。
> 抽离为独立文件属于代码重构（Code Organization），不属于功能缺失。

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
