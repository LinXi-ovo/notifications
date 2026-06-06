# 每日资讯 — 概念设计 · v1.0

> 基于 PLAN-HUMAN.md 需求：在主系统添加资讯推送组件，每次登录获得知识，桌面端卡片展示，手机端可关闭。

---

## 设计决策

| 问题 | 决策 | 理由 |
|---|---|---|
| 展示形式 | **桌面端右下角浮动卡片** | 类似 Notion 更新提示，不抢占主内容，可关闭，尺寸克制 |
| 移动端 | **默认不展示**，设置页开关可控 | 移动屏幕小，浮动卡片会挡内容 |
| 数据来源 | Bmob 新建 `KnowledgeItems` 表 | 管理员 CRUD，与通知表隔离 |
| 推送逻辑 | 每次会话第一条：优先「未读」→ 随机一条；当天已看不重弹 | 避免重复骚扰；每日至少有一条新资讯 |
| 已读/收藏/历史 | **localStorage 本地记录** | 已读状态仅本地有意义，减少 Bmob 查询 |
| 管理后台 | AdminView 新增 tab，复用 wangEditor | 与通知管理一致，减少路由膨胀 |

---

## 一、领域全景

┌──────────────────────────────────────────────────────────────────────┐
│                        每日资讯 (Daily Knowledge)                      │
│                                                                      │
│  管理端 (AdminView tab)           消费端                              │
│  ┌─────────────────────┐        ┌──────────────────────┐             │
│  │ 资讯 CRUD           │        │ 桌面端                │             │
│  │ ┌─────┐ ┌─────┐    │  推送  │  ┌────────┐          │             │
│  │ │新增  │ │列表  │    │ ────→ │  │ 资讯卡片 │          │             │
│  │ └─────┘ └─────┘    │       │  │ (右下角)  │          │             │
│  │                     │       │  └────┬───┘          │             │
│  │ 字段:               │       │       │              │             │
│  │ - 标题              │       │  [✕] [❤] [←] [→]    │             │
│  │ - 内容 (HTML)       │       │  关闭 收藏 上条 下条  │             │
│  │ - 分类标签           │       │                      │             │
│  │ - 来源 & 优先级       │       │ 移动端（默认关闭）     │             │
│  │ - 启用/停用          │       │  ┌─────────────────┐ │             │
│  │                     │       │  │ 首页顶部内联卡片   │ │             │
│  └─────────────────────┘       │  └─────────────────┘ │             │
│                                └──────────────────────┘             │
│  KnowledgeStore (localStorage)                                       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ viewedIds[]  │  favorites[]  │  lastFetchDate  │  index  │       │
│  └──────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘



---

## 二、数据模型

### 2.1 KnowledgeItem（Bmob 表 `KnowledgeItems`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | String | 资讯标题（一句话） |
| `content` | String (HTML) | 资讯正文，复用 wangEditor 编辑 |
| `category` | String | 分类：`tip` / `fact` / `news` / `quote` / `rule` |
| `source` | String | 来源标注（如"教务处""图书馆""精选"） |
| `priority` | Number | 优先级：0=普通，1=置顶，2=必读（红点提示） |
| `tags` | Array\<String\> | 标签，如 `["图书馆","借阅"]` |
| `isActive` | Boolean | 启用开关，关闭后不推送 |
| `coverImage` | String (URL) | 可选封面图 |
| `createdAt` | Date | Bmob 自动字段 |
| `updatedAt` | Date | Bmob 自动字段 |

### 2.2 UserKnowledgeState（localStorage）

键: knowledge:state
值: {
viewedIds: string[],       // 当天已读的资讯 ID 列表
favoriteIds: string[],     // 收藏的资讯 ID 列表（跨天持久）
lastFetchDate: "2026-06-05",  // 最后获取日期，用于每日重置
lastShownIndex: 3,         // 上次展示的资讯在队列中的位置
dismissed: false,           // 当前会话是否已关闭卡片
}



每天 `lastFetchDate !== 今天` 时，清空 `viewedIds` 并重新拉取。

---

## 三、展示形态

### 3.1 桌面端 — 右下角浮动卡片（主要形态）


                                     ┌─────────────────────┐
                                     │ 📚 每日资讯    [✕]   │
                                     │                     │
                                     │ 图书馆借阅规则更新   │
                                     │                     │
                                     │ 自 2026 年 6 月起，  │
                                     │ 每人最多可借 20 本书 │
                                     │ 借期延长至 60 天...  │
                                     │                     │
                                     │ 📎 来源：图书馆      │
                                     │ ─────────────────── │
                                     │ [❤ 收藏]  [← 上条]   │
                                     └─────────────────────┘
                                       ↑ fixed bottom-6 right-6
                                         宽 320px，最大高 280px


交互特征：
- **位置**：`position: fixed; bottom: 24px; right: 24px; z-index: 40`
- **尺寸**：宽 320px，高自适应（最大 280px，超出内部滚动）
- **动画**：从右下角 `slide-up` 滑入（300ms），关闭时 `slide-down` 滑出
- **折叠态**：关闭后缩成一个 32×32px 的 `?` 圆形浮动按钮，点击重新展开
- **关闭逻辑**：点击 ✕ = 当天不再显示（`dismissed: true`），明天重置
- **已读逻辑**：展示 3 秒后自动标记为已读，推入 `viewedIds`
- **上下条**：`← →` 在当前未读资讯队列中前后导航
- **收藏**：❤ 空心 / 实心切换，实时写入 localStorage

### 3.2 移动端 — 首页内联卡片（可选）

┌──────────────────────────┐
│ 📚 每日资讯     [✕]      │
│ 图书馆借阅规则更新...     │
│ [查看详情] [❤]          │
└──────────────────────────┘
↑ 在 HomeView 列表顶部
margin-bottom，可滑动关闭



- 仅在设置 `knowledge:showOnMobile === true` 时渲染
- 更窄（屏幕宽 - 32px），更矮（最多 120px）
- 在通知列表顶部，作为第一个 card 出现

### 3.3 管理后台 — AdminView 新 tab

┌─────────────────────────────────────────────┐
│ [通知管理] [分类管理] [📚 资讯管理]          │
├─────────────────────────────────────────────┤
│ [+ 新增资讯]                                │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 图书馆借阅规则更新          [启用]  [...] │ │
│ │ 分类: rule | 优先级: 0     [编辑] [删除]  │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 四六级报名截止提醒          [停用]  [...] │ │
│ │ 分类: tip  | 优先级: 2     [编辑] [删除]  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘



---

## 四、推送策略

用户进入 HomeView
│
▼
检测 localStorage knowledge:state
│
├─ lastFetchDate !== 今天
│     → 重置 viewedIds = []  // 每天刷新
│     → 重置 dismissed = false
│
├─ dismissed === true → 不弹（今天已手动关闭）
│     → 显示 ? 折叠按钮，用户可手动打开
│
└─ 拉取: Bmob.Query('KnowledgeItems')
.equalTo('isActive', true)
.descending('priority')
.descending('createdAt')
.limit(50)
│
▼
├─ 过滤: 排除 viewedIds 中的 ID（当天已看的不重复推）
│
├─ 队列长度 > 0 → 展示第一条
│     延时 3 秒 → 自动标记已读（推入 viewedIds）
│     记录 lastShownIndex = 0
│     显示卡片动画
│
└─ 队列长度 = 0（所有资讯都已看）
→ 显示"🎉 今日资讯已全部阅读"（轻提示）
→ 卡片自动折叠成 ?
→ 3 秒后淡出



特殊规则：
- **priority=2 必读**：卡片无法关闭（无 ✕ 按钮），必须点 ❤ 或 → 才消失
- **priority=1 置顶**：排在队列最前面，优先展示
- **循环完成**：看完所有资讯后，`?` 按钮仍然保留，点击可重新浏览当天所有已读资讯

---

## 五、组件与文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `src/components/KnowledgeCard.vue` | 组件 | 桌面端右下角浮动卡片 |
| `src/components/KnowledgeInline.vue` | 组件 | 移动端内联卡片（首页顶部嵌入） |
| `src/components/KnowledgeManager.vue` | 组件 | 管理后台资讯列表（AdminView tab 内嵌） |
| `src/components/KnowledgeEditor.vue` | 组件 | 资讯编辑表单对话框（复用 WgEditor） |
| `src/stores/knowledge.js` | Store | Pinia store：Bmob 查询 + localStorage 状态管理 |
| `src/api/knowledge.js` | API | Bmob 表操作层（CRUD 封装） |
| `src/types/knowledge.js` | 类型 | JSDoc 类型定义 + 工厂函数 |

修改的现有文件：

| 文件 | 改动 |
|---|---|
| `src/views/HomeView.vue` | 引入 `KnowledgeCard` + `KnowledgeInline`，在 `onMounted` 触发推送检测 |
| `src/views/SettingsView.vue` | 新增两个开关：显示资讯 / 移动端显示 |
| `src/views/AdminView.vue` | 新增 tab `📚 资讯管理`，渲染 `KnowledgeManager` |
| `src/router/index.js` | 无需新路由（管理通过 tab、收藏通过抽屉） |

---

## 六、状态管理

### knowledgeStore（Pinia）

```js
// state
{
  items: [],           // 当前拉取的资讯列表（缓存）
  userState: {         // 从 localStorage 恢复
    viewedIds: [],
    favoriteIds: [],
    lastFetchDate: '',
    lastShownIndex: 0,
    dismissed: false
  },
  currentItem: null,   // 当前展示的资讯
  queue: [],           // 未读队列
  loading: false
}

// getters
unreadCount           // 当日未读资讯数
unreadQueue           // 未读队列（过滤后）
currentIndex          // 当前在队列中的索引
hasPrevious           // 是否有上一条
hasNext               // 是否有下一条
allRead               // 是否全部已读
isFavorite(id)        // 某个资讯是否已收藏

// actions
fetchItems()          // 从 Bmob 拉取 isActive=true 的资讯
checkAndPush()        // 检查是否该推送给用户，推送下一条
markViewed(id)        // 标记已读
toggleFavorite(id)    // 切换收藏
dismissToday()        // 当天关闭
showPrevious()        // 上一条
showNext()            // 下一条
restoreCard()         // 重新展开卡片（从折叠态）
```

---

## 七、与现有系统的关系

| 维度 | 说明 |
|---|---|
| 通知系统 | 资讯独立于通知 — 通知是用户关注、有时效性的信息聚合；资讯是系统主动推送的轻知识/小贴士 |
| Bmob | 新建 KnowledgeItems 表，复用 `src/api/bmob.js` 的 SDK 实例 |
| wangEditor | KnowledgeEditor 复用 WgEditor 组件，与 NotificationForm 共用编辑器 |
| 管理后台 | AdminView 新增 tab，不增加独立路由页面 |
| 用户认证 | 已读/收藏关联 Bmob User（跨设备同步通过 Bmob 表实现，本地用 localStorage 兜底） |
| 设置页 | 集成到现有 SettingsView 的开关列表中 |
| 路由 | 最小化：管理走 AdminView tab，收藏走抽屉/弹窗，不新增独立路由 |

---

## 八、实施路线

P0 ────────────── P1 ────────────── P2
│                  │                  │
├ 数据模型         ├ 管理端 CRUD       ├ 收藏功能
├ 右下角卡片       ├ 移动端适配        ├ 浏览历史
├ knowledgeStore   ├ 设置页开关        ├ 必读/置顶逻辑
└ 每日推送逻辑      └ AdminView tab     └ 动画与边界状态

### P0 — 核心推送（MVP）

| 内容 | 产出 |
|---|---|
| Bmob KnowledgeItems 表设计 + API 层 | `src/api/knowledge.js` |
| 类型定义 + 工厂函数 | `src/types/knowledge.js` |
| knowledgeStore（localStorage + Bmob） | `src/stores/knowledge.js` |
| KnowledgeCard 浮动卡片（桌面端右下角） | `src/components/KnowledgeCard.vue` |
| HomeView 集成：onMounted 触发推送检测 | 修改 HomeView.vue |
| 每日推送策略：重置 → 拉取 → 过滤 → 展示 | store 内实现 |

### P1 — 管理端 + 设置

| 内容 | 产出 |
|---|---|
| KnowledgeEditor 表单（复用 WgEditor） | `src/components/KnowledgeEditor.vue` |
| KnowledgeManager 列表（AdminView tab） | `src/components/KnowledgeManager.vue` |
| AdminView 新增 tab | 修改 AdminView.vue |
| SettingsView 开关：显示资讯 / 移动端显示 | 修改 SettingsView.vue |
| KnowledgeInline 移动端内联卡片 | `src/components/KnowledgeInline.vue` (或条件渲染) |

### P2 — 增强

| 内容 | 产出 |
|---|---|
| 收藏抽屉（底部滑出或独立弹窗） | 集成到 KnowledgeCard 或独立组件 |
| 浏览历史：今天已看的资讯回顾 | store 内 viewedIds 列表 UI |
| priority=2 必读模式（无 ✕ 按钮） | KnowledgeCard 条件渲染 |
| 上下条切换动画 | CSS transition |
| "已全部阅读" 状态 + 折叠 ? 按钮 | KnowledgeCard 状态机 |

---

## 九、未决设计问题

1. **收藏是否跨设备同步？** 当前设计为纯 localStorage，跨设备不互通。如需同步，可在 Bmob 新建 KnowledgeFavorite 关联表
2. **推送时机：是否仅在首页弹？** 进入 DetailView 或其他页面时是否也弹？当前设计是仅在 HomeView 触发
3. **每日资讯数量上限：** 如果管理员发布 100 条，用户每天最多浏览多少？当前无硬性上限（队列最大 50 条拉取）
4. **管理员推送权限：** 是否仅管理员可创建资讯？当前设计：资讯管理与通知管理权限一致（admin 可 CRUD）
5. **必读确认：** priority=2 必读是否需要用户点"已读确认"按钮，而非仅浏览即标记？可加 `requireConfirm` 字段
6. **定时推送：** 是否需要后台定时任务在特定时间推特定资讯？不在 P0-P2 范围内