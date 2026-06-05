# 任务系统 — 通知系统集成方案 · v4.0

> 基于 v3.2 任务系统 + 现有通知聚合系统，设计持久化升级与双向集成方案。
> 目标：任务数据上云、通知↔任务双向跳转、统一用户体验。

---

## 现状分析

### 通知系统（现有）
| 维度 | 技术栈 |
|---|---|
| 数据层 | **Bmob 后端云** (Parse 衍生) — 所有 CRUD 走 Bmob SDK |
| 用户认证 | Bmob.User — 注册/登录/角色 (UserRoles 表) |
| 存储 | **腾讯云 COS** — 图片/附件直传，含压缩/缓存 |
| AI 能力 | DeepSeek — 通知智能生成 |
| 部署 | Cloudflare Pages + GitHub Pages 双线 |
| 前端 | Vue 3 + Pinia + Tailwind v4 |

### 任务系统（当前）
| 维度 | 实现 |
|---|---|
| 数据层 | **localStorage 纯本地** — `missions:index` / `mission:{id}` / `missions:recycle` |
| 用户认证 | 共享 UserStore (`userStore.username`) — 但身份仅用于认领/权限判定 |
| 持久化 | 无后端 — 浏览器清缓存即丢失 |
| 存储 | 无文件上传能力 |
| 路由 | `/missions` / `/mission/:id` — 已有，但不干扰通知路由 |

### 差距
| 问题 | 影响 |
|---|---|
| ❌ 数据在 localStorage | 换设备/清缓存 → 任务丢失 |
| ❌ 无多设备同步 | 手机认领 → 电脑不可见 |
| ❌ 无法分享 | 任务不能通过链接分享给他人 |
| ❌ 没有通知引用 | 任务节点无法直接跳转到相关通知 |
| ❌ 没有 Deadline 提醒 | 任务截止日期无推送 |

---

## 总体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                       前端 (Vue 3 SPA)                               │
│                                                                     │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   通知模块            │  │    任务模块                            │  │
│  │                      │  │                                       │  │
│  │ NotificationStore    │  │  MissionStore                         │  │
│  │   → Bmob SDK         │  │   → Bmob SDK (新增)                   │  │
│  │   → 纯云端            │  │   → localStorage (离线缓存)           │  │
│  │                      │  │   → MissionSyncEngine (同步层-新增)    │  │
│  │  NotificationCard    │  │                                       │  │
│  │   → [[mission:id]]   │  │  NodeCard                            │  │
│  │   → 跳转 /mission    │  │   → [[notif:id]]                     │  │
│  └──────────┬───────────┘  │   → 详情页显示关联通知                 │  │
│             │              └──────────────┬───────────────────────┘  │
│             │                              │                        │
│             ▼                              ▼                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    共享基础设施                                 │  │
│  │  • Bmob SDK (bmob.js)    • UserStore (认证)                  │  │
│  │  • COS 文件上传           • DeepSeek AI                       │  │
│  │  • AppHeader 导航         • 路由守卫                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 数据持久化上云（当前任务）

### 1.1 Bmob 数据表设计

在 Bmob 中新增两张表：`Mission` 和 `MissionAssignment`。

#### Mission 表

| 字段 | 类型 | 说明 |
|---|---|---|
| `objectId` | String (自动) | Bmob 主键 — 替代现有 `mission-xxx` 作为任务 ID |
| `title` | String | 任务标题 |
| `description` | String | 任务描述 |
| `createdBy` | Pointer<User> | 创建者 |
| `status` | String | `active` / `archived` |
| `tags` | Array<String> | 标签 |
| `version` | String | 数据版本号，当前 `4.0` |
| `ACL` | ACL (自动) | 登录用户可读，创建者可写 |
| `layoutData` | String (JSON) | **DAG 结构数据** — 含 nodes / edges / roles / customFields / reminders |
| `deletedAt` | Date | 软删除时间（回收站用） |

**为什么用 `layoutData` 存 JSON 而不是拆分表：**
- 与通知系统的 `content` (HTML) 字段同样的"大字段"模式
- 避免 Bmob 查询 JOIN 的限制
- DAG 结构是整体加载的，不存在部分更新场景
- 简化 ACL 管理

#### MissionAssignment 表（归一化认领数据）

| 字段 | 类型 | 说明 |
|---|---|---|
| `objectId` | String (自动) | |
| `missionId` | Pointer<Mission> | 所属任务 |
| `userId` | Pointer<User> | 认领用户 |
| `roleId` | String | 角色 ID（在 mission JSON 内定义） |
| `status` | String | `approved` / `pending` / `rejected` |
| `assignedAt` | Date | |
| `approvedBy` | String | |
| `approvedAt` | Date | |

**为什么认领数据要单独拆表：**
- 需要按用户查询（"我的任务"）
- 需要跨任务统计（用户参与了多少任务）
- 数据量小但查询频繁
- 认领状态变化独立于 DAG 结构

### 1.2 同步策略：Bmob + localStorage 双写

```
┌──────────────────────────────────────────────┐
│               MissionStore                     │
│                                                │
│  ┌─────────────┐     ┌────────────────────┐   │
│  │ localStorage │◄────│   Sync Engine      │   │
│  │ (离线缓存)    │     │                    │   │
│  │              │     │  loadFromBmob()     │   │
│  │ missions:index│    │  saveToBmob()       │   │
│  │ mission:{id}  │    │  syncDown()         │   │
│  │              │     │  syncUp()           │   │
│  └─────────────┘     └────────┬───────────┘   │
│                               │               │
│                               ▼               │
│                        ┌──────────────┐       │
│                        │  Bmob SDK    │       │
│                        │  Mission 表   │       │
│                        │  MissionAssi │       │
│                        │  gnment 表    │       │
│                        └──────────────┘       │
└──────────────────────────────────────────────┘
```

#### 加载流程

```
用户打开任务列表 (MissionListView)
    │
    ▼
MissionStore.fetchIndex()
    │
    ├── ▲ 在线模式（默认）:
    │     ├── Bmob.Query('Mission')
    │     │     .notEqualTo('deletedAt', null) ← 排除回收站
    │     │     .order('-updatedAt')
    │     │     .limit(100)
    │     │
    │     ├── 写入 localStorage 缓存
    │     │     missions:index ← 概要列表
    │     │
    │     └── 返回 index
    │
    └── ▲ 离线模式（Bmob 不可用）:
          └── 读 localStorage missions:index 兜底
```

```
加载单个任务 (MissionGraphView)
    │
    ▼
MissionStore.loadMission(id)
    │
    ├── ▲ 在线:
    │     ├── Bmob.Query('Mission').get(id)
    │     ├── JSON.parse(_layout) → currentMission
    │     ├── 查询 MissionAssignment 表中该 mission 的认领
    │     │     Bmob.Query('MissionAssignment')
    │     │       .equalTo('missionId', '==', pointer)
    │     │       .find()
    │     │
    │     ├── 合并: currentMission.assignments = assignments
    │     ├── 写入 localStorage 缓存
    │     └── 返回
    │
    └── ▲ 离线:
          └── 读 localStorage mission:{id}
```

#### 保存流程

```
用户操作 → store action (addNode/changeStatus/claimRole...)
    │
    ▼
localStorage 写入（即时）
    │
    ▼
_saveToBmob()（防抖 500ms）:
    ├── 更新 Mission 表:
    │     Bmob.Query('Mission').set(...)
    │       .set('_layout', JSON.stringify({
    │         nodes, edges, roles, customFields, reminders
    │       }))
    │
    ├── 同步 MissionAssignment 表:
    │     - 删除本地有但云端无的 assignment
    │     - 新增云端无的 assignment
    │     - 更新状态变化的 assignment
    │
    └── 更新索引
```

#### 防抖设计

```js
// store action 中
_saveToBmobDebounced = useDebounceFn(() => {
  this._saveToBmob()
}, 500)

// 每次变更后调用
_saveToBmob() {
  if (!this.currentMission || !this.currentMission.id) return
  // 只在在线状态保存到 Bmob
  const data = {
    title: this.currentMission.title,
    description: this.currentMission.description,
    status: this.currentMission.status,
    tags: this.currentMission.tags,
    version: '4.0',
    _layout: JSON.stringify({
      nodes: this.currentMission.nodes,
      edges: this.currentMission.edges,
      roles: this.currentMission.roles,
      customFields: this.currentMission.customFields || [],
      reminders: this.currentMission.reminders || []
    })
  }
  saveBmobMission(this.currentMission.id, data)
  this._syncAssignmentsToBmob()
}
```

### 1.3 API 层封装

新建 `src/api/mission.js`：

```js
// Bmob Mission API 封装
import Bmob from './bmob'

const TABLE = 'Mission'
const ASSIGN_TABLE = 'MissionAssignment'

/** 获取任务列表 */
export async function fetchMissionIndex() {
  const q = Bmob.Query(TABLE)
  q.addWhere('deletedAt', '==', null)  // 过滤回收站
  q.order('-updatedAt')
  q.limit(100)
  return await q.find()
}

/** 获取单个任务（含 _layout JSON） */
export async function fetchMission(id) {
  const q = Bmob.Query(TABLE)
  const result = await q.get(id)
  return result
}

/** 保存任务（创建或更新） */
export async function saveMission(id, data) {
  const q = Bmob.Query(TABLE)
  q.set('id', id)
  Object.entries(data).forEach(([k, v]) => q.set(k, v))
  return await q.save()
}

/** 软删除任务 */
export async function softDeleteMission(id) {
  const q = Bmob.Query(TABLE)
  q.set('id', id)
  q.set('deletedAt', new Date().toISOString())
  return await q.save()
}

/** 永久删除任务 */
export async function hardDeleteMission(id) {
  const q = Bmob.Query(TABLE)
  await q.destroy(id)
}

/** 获取任务的所有认领 */
export async function fetchAssignments(missionPointer) {
  const q = Bmob.Query(ASSIGN_TABLE)
  q.equalTo('missionId', '==', missionPointer)
  return await q.find()
}

/** 同步认领数据 */
export async function syncAssignments(missionId, localAssignments) {
  const missionPointer = Bmob.Pointer(TABLE, missionId)
  const cloudAssignments = await fetchAssignments(missionPointer)
  // 差异同步逻辑...
}
```

### 1.4 离线策略

| 场景 | 行为 |
|---|---|
| **首次加载/在线** | Bmob → 写入 localStorage 缓存 → 渲染 |
| **网络断开/Bmob 不可用** | 读 localStorage 缓存 → 渲染 → 显示横幅「离线模式 - 数据可能不是最新」 |
| **离线编辑** | 允许编辑 → 写入 localStorage → 标记 pendingSync → 网络恢复后自动同步 |
| **版本冲突** | 以 Bmob 数据为准，本地有 pendingSync 则弹窗提示「本地有未提交的修改」 |

### 1.5 迁移方案

```mermaid
flowchart LR
    subgraph "旧数据 (localStorage)"
        A[missions:index]
        B[mission:{id}]
        C[missions:recycle]
    end
    
    subgraph "迁移脚本"
        D[读取 localStorage]
        E[转换格式 v3→v4]
        F[写入 Bmob]
        G[标记已迁移]
    end
    
    subgraph "新数据 (Bmob)"
        H[(Mission 表)]
        I[(MissionAssignment 表)]
    end
    
    A --> D --> E --> F --> H
    C --> D
    B --> D
    F --> G
    G --> H
    G --> I
```

迁移时机：用户升级后首次访问 `/missions` 时自动执行。

```js
// MissionListView.vue onMounted
async function onMounted() {
  const migrated = localStorage.getItem('missions:migrated')
  if (!migrated) {
    await migrateLocalToBmob()
    localStorage.setItem('missions:migrated', new Date().toISOString())
  }
  // 继续正常加载...
  await missionStore.fetchIndex()
}
```

---

## Phase 2: 通知 ↔ 任务双向链接

### 2.1 JumpLink 系统

#### 任务节点中引用通知

```
编辑器输入:  [[notif:abc123]]  →  渲染为: 🔗 相关通知标题
```

实现方案：
- 复现 Mermaid Token/Map 分离模式
- `JumpLinkRenderer.vue` 负责解析 `[[notif:id]]` 并渲染为可点击链接
- 点击跳转到 `/detail/:id`

#### 通知详情中显示相关任务

在 `DetailView.vue` 底部增加「相关任务」区块：

```
┌──────────────────────────────────────────┐
│ 通知详情                                  │
│ ...                                      │
│ ──────────────────────────────────────── │
│ 📋 相关任务                               │
│  ┌────────────────────────────────────┐  │
│  │ 📋 综测信息收集 (进行中) 75%       │  │
│  │   你已认领: 普通成员 ✅            │  │
│  │   当前节点: 填写信息表 🟢可操作     │  │
│  │   [↗ 查看任务]                     │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

实现方式：
- `DetailView.vue` 新增 `jumpLinks` 字段
- 或：通知模型中新增 `missions: Array<Pointer<Mission>>` 字段
- 任务引用通知时，反向记录到通知的 `referencedByMissions` 字段

#### 双向引用数据方案

```
通知创建时/任务编辑时:
  A) 任务节点的 content 中包含 [[notif:id]]
  B) 任务主动声明引用了某通知

数据层:
  通知模型新增字段 referencedMissions: Array<Pointer>
    → 由任务保存时通过 Bmob Cloud Function 反向更新
    → 或由任务创建者手动关联
```

**推荐方案：Bmob Cloud Function**

```
任务保存 (addNode/updateNode) →
  Cloud Function scanMissionRefs(missionId):
    1. 遍历所有节点的 content
    2. 提取 [[notif:id]] 引用
    3. 更新对应 Notification 的 referencedMissions 字段
```

### 2.2 任务通知联动

| 事件 | 触发 |
|---|---|
| 有新任务分配给我 | MissionAssignment 创建时 → 关联的通知有新评论 |
| 任务节点 deadline 到期 | 任务系统检查 → 调用 Bmob 云函数 → 新建 Notification |
| 通知中创建任务 | 通知详情 → "创建任务" 按钮 → 预填标题/描述 |
| 任务完成 | 节点 completed → 可选：在关联通知下新增评论 |

### 2.3 路由整合

当前路由：
```
/missions            → MissionListView
/mission/:id         → MissionGraphView
```

新增路由：
```
/mission/:id/node/:nodeId   → MissionNodeDetailView (节点富文本编辑)
/missions/shared/:shareId   → 分享的外部查看页 (只读)
/notif/:id/tasks            → 某通知关联的任务列表
```

---

## Phase 3: 多设备同步与离线

### 3.1 同步引擎设计

```js
class MissionSyncEngine {
  // 同步方向：Bmob → localStorage (下行)
  async syncDown(missionId) {
    const cloud = await fetchMission(missionId)
    const local = loadMissionLocal(missionId)
    
    if (!local || cloud.updatedAt > local.updatedAt) {
      // 云端更新 → 覆盖本地
      saveMissionLocal(missionId, cloud)
      return { updated: true }
    }
    return { updated: false }
  }
  
  // 同步方向：localStorage → Bmob (上行)
  async syncUp(missionId) {
    const local = loadMissionLocal(missionId)
    const pending = local.pendingSync
    
    if (pending) {
      // 有未提交的本地修改 → 提交到 Bmob
      await saveMission(missionId, local)
      local.pendingSync = false
      saveMissionLocal(missionId, local)
      return { synced: true }
    }
    return { synced: false }
  }
  
  // 全量同步
  async fullSync(missionId) {
    const down = await this.syncDown(missionId)
    const up = await this.syncUp(missionId)
    return { down, up }
  }
}
```

### 3.2 冲突处理

```
场景: 用户 A 和用户 B 同时编辑同一任务的节点
  │
  ▼
last-write-wins (基于 updatedAt):
  ├── 保存时附上本地 updatedAt
  ├── Bmob 对比云端 updatedAt
  │     ├── 云端更新 → 拒绝保存，返回最新数据
  │     └── 未更新 → 允许保存
  │
  └── UI 提示:
        ├── 保存冲突 → 弹窗「数据已被其他用户修改，已刷新」
        └── 自动重载 latest
```

---

## Phase 4: 用户任务面板

### 4.1 「我的任务」入口

在 AppHeader 中增加用户任务入口，或在首页增加任务区块：

```
📢 通知聚合  |  ⭐ 收藏  |  📋 任务  |  👤 我的任务  |  ✏️ 管理
```

### 4.2 用户级任务聚合

从 `MissionAssignment` 表跨任务查询：

```js
// 获取用户参与的所有任务
async function getMyMissions(userId) {
  const q = Bmob.Query('MissionAssignment')
  q.equalTo('userId', '==', Bmob.Pointer('_User', userId))
  q.equalTo('status', '==', 'approved')
  const assignments = await q.find()
  
  // 提取任务 ID 列表
  const missionIds = [...new Set(assignments.map(a => a.missionId.objectId))]
  
  // 查询任务详情（含进度）
  const missions = await Promise.all(
    missionIds.map(id => fetchMission(id))
  )
  return missions
}
```

### 4.3 首页任务概览

在 `HomeView.vue` 中增加：

```
┌──────────────────────────────────┐
│ 📋 我的任务 (3)  [查看全部 →]    │
├──────────────────────────────────┤
│ 📊 综测收集       进行中  75%    │
│   待操作: 「填写信息表」🟢       │
├──────────────────────────────────┤
│ 📊 评奖评优       进行中  2/5    │
│   待操作: 「审核材料」🔒         │
├──────────────────────────────────┤
│ 📊 毕业审核       已完成  ✅     │
└──────────────────────────────────┘
```

---

## Phase 5: 文件与 AI 集成

### 5.1 任务附件 → COS 直传

复用通知系统的 COS 上传链路：

```js
// NotificationForm 的附件上传
import { uploadFile } from '@/api/file'

// 任务节点附件上传
async function uploadNodeAttachment(nodeId, file) {
  const result = await uploadFile(file)  // 复用现有 COS 上传
  missionStore.addAttachment(nodeId, {
    name: file.name,
    url: result.url,
    mime: file.type
  })
}
```

### 5.2 AI 生成任务

复用 DeepSeek API + AiGenerator：

```
AI 导入对话框 (MissionListView 已有) → 接受 JSON → parseAiMission → 创建任务

增强方案:
  AiGenerator 增加「生成任务」模式:
  输入: 微信群通知文本 / 截图 OCR 结果
  输出: 结构化任务 JSON (含角色/节点/依赖)
```

---

## 实施路线

```
Phase 1 (P0)     Phase 2 (P1)     Phase 3 (P2)     Phase 4 (P3)
─────────────    ─────────────    ──────────────    ─────────────
Bmob 数据表创建    JumpLink 渲染    同步引擎          用户任务面板
API 层封装        DetailView      冲突处理          首页任务概览
双写同步策略       任务关联         离线编辑          「我的任务」页
迁移脚本          Cloud Function   pendingSync      跨任务聚合
离线缓存                                              

                  Phase 5 (P4):
                  ──────────────
                  COS 附件上传
                  AI 任务生成
                  Deadline 提醒
                  Notification 联动
```

### 优先级与预估

| 阶段 | 内容 | 预估工时 | 依赖 |
|---|---|---|---|
| **P0** | Bmob 数据表 + API + 双写同步 + 迁移 | 3-4h | Bmob 环境可用 |
| **P1** | JumpLink 渲染 + 通知关联 + 详情页集成 | 2-3h | P0 完成 |
| **P2** | 同步引擎 + 冲突处理 + 离线编辑 | 2-3h | P0 完成 |
| **P3** | 用户任务面板 + 首页概览 | 1-2h | P1 完成 |
| **P4** | COS 附件 + AI 生成 + Deadline 提醒 | 2-3h | P0+P1 完成 |

---

## 数据安全与 ACL

### 默认权限

| 资源 | ACL |
|---|---|
| Mission 表 | 登录用户: read，创建者: write，管理员: write |
| MissionAssignment 表 | 登录用户: read (仅自己的)，创建者: read+write |
| 通知引用 | 继承通知原有的 ACL (登录用户可读) |

### 回收站

```
软删除: Mission.deletedAt = Date
  fetchIndex 自动过滤 deletedAt 非空
  
永久删除: Bmob destroy()
  仅限管理员/创建者操作
  30 天自动清理: Bmob Cloud Function (定时任务)
```

---

## 与 PLAN-AI.md 的映射

| PLAN-AI.md 阶段 | 原计划 | 本方案变化 |
|---|---|---|
| P0-M4 导入导出 | JSON 单文件 | 增加 Bmob 云端存储，JSON 文件作为备份 |
| P1-M7 角色过滤 | 组件 | 增加跨任务的用户角色聚合 |
| P2-M9 JumpLink | 组件 | 增加通知 ↔ 任务双向跳转 |
| P3-M12-M16 | 自定义字段/评论/子图 | 统一放入 _layout JSON，Bmob 大字段模式 |
| P4-M20 多端同步 | Bmob 文件存储同步 | 改为 Bmob 数据库同步 (Mission 表) |

---

## 附录：API 函数签名

```js
// src/api/mission.js

/** 获取任务列表 */
export async function fetchMissionIndex(): Promise<MissionIndexItem[]>

/** 获取单个任务（含 layout） */
export async function fetchMission(id: string): Promise<MissionData>

/** 创建任务 */
export async function createMission(data: CreateMissionInput): Promise<MissionData>

/** 更新任务 layout */
export async function updateMissionLayout(id: string, layout: MissionLayout): Promise<void>

/** 软删除 */
export async function softDeleteMission(id: string): Promise<void>

/** 永久删除 */
export async function hardDeleteMission(id: string): Promise<void>

/** 获取认领列表 */
export async function fetchAssignments(missionId: string): Promise<Assignment[]>

/** 批量同步认领 */
export async function syncAssignments(missionId: string, assignments: Assignment[]): Promise<void>

/** 获取用户所有任务 */
export async function getUserMissions(userId: string): Promise<UserMissionSummary[]>

/** 扫描任务中的通知引用 */
export async function scanMissionRefs(missionId: string): Promise<void>
```
