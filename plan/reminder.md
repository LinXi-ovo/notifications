# 通知提醒 / 截止日期 ⏰

> 规划时间：2026-06-05
> 状态：📋 规划中

## 问题

通知（如作业提交、材料截止、活动报名）有截止日期，用户容易忘记。

## 需求

- 通知可以设置截止日期（deadline）
- 用户可以收藏/订阅某个通知
- 在截止日期前 N 时间（2小时/0.3天/1天）自动提醒订阅者
- 提醒方式：站内横幅（打开 App 时）+ 浏览器推送通知

## 数据模型

### Notification 表增加字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `deadline` | Date | 截止日期（可选） |
| `reminderLeadTime` | Array(String) | 提前提醒时间，如 `["2h", "0.3d", "1d"]` |

### Reminder 表（新建）

| 字段 | 类型 | 说明 |
|------|------|------|
| `user` | Pointer(User) | 被提醒人 |
| `notification` | Pointer(Notification) | 关联通知 |
| `remindAt` | Date | 计划提醒时间 |
| `reminded` | Boolean | 是否已提醒 |
| `remindedAt` | Date | 实际提醒时间 |

## 架构决策

| 方案 | 说明 | 推荐 |
|------|------|------|
| **浏览器定时检查** | 打开 App 时检查未读提醒，弹横幅 | ✅ 必做，简单可靠 |
| **Browser Notification API** | 浏览器原生推送通知（关掉页面也能弹） | ✅ 可选增强 |
| **Bmob 云函数定时任务** | 服务端自动发邮件/推送 | ❌ Bmob 云函数能力有限 |
| **WebSocket 长连接** | 实时推送 | ❌ 需要额外服务，小工具过度设计 |
| **邮件提醒** | 发送邮件到用户邮箱 | ❌ 需要邮件服务，且用户不一定查收 |

## 实施阶段

### Phase 1：通知 data model（小）

```
① Notification 表增加 deadline、reminderLeadTime 字段
  - deadline: Date（可选，通知有截止日期时设置）
  - reminderLeadTime: ["2h", "0.3d", "1d"]（可选，预设快选）
② NotificationForm 增加截止日期输入（日期选择器 + 快选预设）
③ 详情页显示截止日期倒计时
```

**预估**：小，1 天

### Phase 2：收藏订阅 + 站内提醒（中）

```
① 收藏即订阅：收藏某条通知 = 订阅其提醒
② Reminder 数据表 + API（checkReminders、ackReminder）
③ 首页/全局组件：登录时检查未读提醒
  - 有到期提醒时弹出横幅（toast 或 modal）
  - 点击跳转到对应通知详情
```

**预估**：中，1-2 天

### Phase 3：浏览器推送通知（小）

```
① 请求 Notification API 权限
② 注册 Service Worker（Vite PWA 插件）
③ 即使用户关闭页面，也能在截止前收到桌面推送
```

**预估**：小，0.5 天

## 提醒触发逻辑

```
用户打开 App
  → 遍历用户收藏的通知
  → 检查每条通知的 deadline
  → 对于每个 deadline，计算当前时间是否在提醒窗口内
    （deadline - reminderLeadTime ≤ 当前时间 ≤ deadline）
  → 是 → 展示提醒标记已提醒
  → localStorage 记录已提醒过的通知，防止重复弹窗
```

## 完成路径

| 阶段 | 内容 | 预估 |
|------|------|------|
| Phase 1 | data model + 截止日期输入 | 1 天 |
| Phase 2 | 收藏订阅 + 站内提醒 | 1-2 天 |
| Phase 3 | 浏览器桌面推送 | 0.5 天 |
| **合计** | | **2-3 天** |

**复杂度**：低。核心是 data model + 前端定时检查，不需要后端服务。
