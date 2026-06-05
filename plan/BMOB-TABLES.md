# Bmob 数据库表手册

> Bmob 后端云 (`hydrogen-js-sdk`) 表结构速查。
> 字段大小写规则：JavaScript SDK 使用 camelCase，REST API 使用 camelCase。
> Bmob 自动为每条记录添加 `objectId`, `createdAt`, `updatedAt`。

---

## 1. `Notifications` — 通知

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | Bmob 自动生成 |
| `title` | String | string | ✅ | 通知标题 |
| `content` | String | string | | HTML 富文本内容，含 Mermaid Token / 媒体标签 |
| `type` | String | string | | 分类值，对应 `Category.value`（如 `zongce`, `baoyan`） |
| `sourceGroup` | String | string | | 来源群名 |
| `sourcePerson` | String | string | | 来源人 |
| `originalLink` | String | string | | 原文链接 |
| `priority` | Number | number | | 0=普通 1=置顶 2=重要 3=紧急 |
| `tags` | Array | string[] | | 标签数组 |
| `status` | String | string | | `active` / `archived` |
| `deleted` | Boolean | boolean | | 软删除标记 |
| `deletedAt` | Number | number | | 删除时间戳 (ms) |
| `deadline` | Date | string | | 截止日期 ISO |

**API 文件**: `src/api/notification.js`
**查询要点**:
- `equalTo('deleted', '!=', true)` 过滤已删除
- `equalTo('type', '!=', 'test')` 默认过滤测试通知
- `showTest` 参数控制是否显示 `test` 类型
- `order('-priority', '-createdAt')` 优先级+时间排序

---

## 2. `Category` / `Categories` — 分类

> ⚠️ 注意：Bmob 表名是 `Category`（某些地方表名是 `Categories`，取决于实际创建时的命名）

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | |
| `name` | String | string | ✅ | 显示名（如"综测"） |
| `value` | String | string | ✅ | 值（如 `zongce`） |
| `icon` | String | string | | 图标 emoji |
| `color` | String | string | | 颜色名 |
| `sortOrder` | Number | number | | 排序序号 |
| `isActive` | Boolean | boolean | | 是否启用 |

**API 文件**: `src/api/category.js`
**内置值**: `zongce`, `baoyan`, `activity`, `course`, `homework`, `other`, `test`

---

## 3. `_User` — 用户（Bmob 内建表）

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | 用户唯一 ID |
| `username` | String | string | ✅ | 用户名 |
| `password` | String | string | ✅ | 密码（SDK 自动哈希） |
| `email` | String | string | | 邮箱 |
| `mobilePhoneNumber` | String | string | | 手机号 |

**API 文件**: `src/api/user.js`
**操作**:
- `Bmob.User.login(username, password)` → 返回 user 对象
- `Bmob.User.register(params)` → 注册
- `Bmob.User.current()` → 当前登录用户（含 `objectId`）
- `Bmob.User.logout()` → 退出

---

## 4. `UserRoles` — 用户角色映射

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | |
| `userId` | String | string | ✅ | 对应 `_User.objectId` |
| `username` | String | string | | 冗余用户名，便于管理 |
| `role` | String | string | ✅ | `user`（普通）/ `admin`（管理员） |

**API 文件**: `src/api/user.js`
**要点**:
- 角色值：`user` / `admin`
- `isAdmin()` 判定逻辑：`role === 'admin' || username === 'admin'`
- 角色写入 localStorage `bmob_user_role` 跨页面持久化

---

## 5. `Files` — 文件注册表

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | |
| `name` | String | string | ✅ | 文件名 |
| `url` | String | string | ✅ | COS URL |
| `mimeType` | String | string | | MIME 类型 |
| `size` | Number | number | | 文件大小（字节） |
| `uploader` | Pointer (`_User`) | Pointer | | 上传者 |
| `usedBy` | Array | string[] | | 被哪些通知引用 |

**API 文件**: `src/api/file.js`

---

## 6. `Favorites` — 收藏

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | |
| `user` | Pointer (`_User`) | Pointer | ✅ | 收藏用户 |
| `notification` | Pointer (`Notifications`) | Pointer | ✅ | 被收藏的通知 |

**API 文件**: `src/api/favorite.js`

---

## 7. `Mission` — 任务（⚠️ 最复杂的表）

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | Bmob objectId，存在本地映射表 `missions:idmap` |
| `missionId` | String | string | ✅ | 客户端 ID，格式 `mission-xxxxxxxx` |
| `title` | String | string | ✅ | 任务标题 |
| `description` | String | string | | 描述 |
| `createdBy` | **Pointer (`_User`)** | **object** | ✅ | ⚠️ **必须传 Pointer 对象**，不能传字符串 |
| `status` | String | string | | `active` / `archived` |
| `tags` | Array | string[] | | 标签数组 |
| `version` | String | string | | 结构版本号（当前 `"4.0"`） |
| `layoutData` | **String** | **string** | | ⚠️ **大字段 JSON 字符串**，含 `nodes/edges/roles/customFields/reminders` |
| `deletedAt` | String | string | | 软删除时间 ISO |
| `pendingSync` | **String** | **string** | | ⚠️ **String 类型**，传 `"true"` 或 `"false"`，不是 Bool |

**API 文件**: `src/api/mission.js`
**ID 映射**: 本地 localStorage `missions:idmap` `{ missionId: bmobObjectId }`

### ⚠️ 已知陷阱（踩坑记录）

```
1. createdBy 必须传 Pointer JSON，格式：
   { __type: 'Pointer', className: '_User', objectId: '用户objectId' }
   ❌ 传字符串 "AI"        → 400 (expected Pointer, got String)
   ❌ 不传                 → 400 (必填)
   ❌ Bmob.Pointer('_User', id) → 400 (expected Pointer, got Object)
   ✅ { __type, className, objectId } 直接

2. pendingSync 是 String 类型，不是 Bool：
   ❌ q.set('pendingSync', false)    → 400 (expected String, got Bool)
   ✅ q.set('pendingSync', 'false')

3. layoutData 是 String，存 JSON.stringify 结果：
   序列化：JSON.stringify({ nodes, edges, roles, customFields, reminders })
   反序列化：JSON.parse(layoutData)

4. 获取 objectId 的两种方式：
   - 查 ID 映射表：getBmobId(missionId)
   - REST API 查：fetchMission(missionId) → result._bmobObjectId
```

---

## 8. `MissionAssignmen` — 任务认领（⚠️ 表名少了个 t）

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | |
| `missionId` | Pointer (`Mission`) | Pointer | ✅ | 指向 Mission 表 |
| `userId` | String | string | ✅ | 用户 ID（目前是用户名） |
| `roleId` | String | string | ✅ | 角色 ID |
| `status` | String | string | | `pending` / `approved` / `rejected` |
| `assignedAt` | String | string | | 认领时间 ISO |
| `approvedBy` | String | string | | 审批人 |
| `approvedAt` | String | string | | 审批时间 ISO |

**API 文件**: `src/api/mission.js`
**同步策略**: 全量比对——删除云端多余、新增/更新本地差异

---

## 9. `KnowledgeItems` — 每日资讯

| 字段 | Bmob 类型 | JS 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `objectId` | String | string | 自动 | |
| `type` | String | string | ✅ | `sentence` / `paragraph` / `article` |
| `title` | String | string | | 标题 |
| `content` | String | string | ✅ | 内容 |
| `source` | String | string | | 来源 |
| `author` | String | string | | 作者 |
| `category` | String | string | | 分类标签 |

**API 文件**: `src/api/knowledge.js`

---

## 通用 `q.set()` 类型速查

| JS 类型 | Bmob 类型 | 示例 | 说明 |
|---|---|---|---|
| `string` | String | `"hello"` | |
| `number` | Number | `42` | |
| `boolean` | Boolean | `true` | |
| `string[]` | Array | `["a","b"]` | |
| `{__type, className, objectId}` | Pointer | 见上 | ⚠️ `Bmob.Pointer()` 不可靠 |

## REST API 访问

```rust
// Rust 端直接调 Bmob REST API
GET https://api.bmobcloud.com/1/classes/{TableName}
Headers:
  X-Bmob-Application-Id: <VITE_BMOB_SECRET_KEY>
  X-Bmob-REST-API-Key: <VITE_BMOB_API_SAFE_CODE>
```

Bmob 控制台: https://www.bmob.cn/
