# Tauri 桌面应用 — AI 实施路线（已实现）

> ✅ **P0 + P1 已全部实现，P2 核心能力已到位**

---

## 实施状态总览

| 阶段 | 任务 | 状态 | 文件 |
|---|---|---|---|
| P0 | Tauri 骨架 | ✅ 完成 | `src-tauri/` |
| P0 | tauri.conf.json 配置 | ✅ 完成 | `src-tauri/tauri.conf.json` |
| P0 | Vite 构建集成 | ✅ 完成 | `package.json` scripts |
| P1 | 系统托盘 | ✅ 完成 | `src-tauri/src/tray.rs` |
| P1 | SQLite 离线缓存 | ✅ 完成 | `src-tauri/src/db.rs` |
| P1 | Bmob 同步引擎 | ✅ 完成 | `src-tauri/src/sync.rs` |
| P1 | 桌面通知 | ✅ 完成 | `src-tauri/src/notify.rs`, `commands.rs` |
| P1 | Tauri Bridge | ✅ 完成 | `src/api/tauri.js` |
| P1 | Sync Store | ✅ 完成 | `src/stores/sync.js` |
| P2 | 开机自启 | ✅ 完成 | `commands.rs` + `tauri-plugin-autostart` |
| P2 | 全局快捷键 Ctrl+Shift+N | ✅ 完成 | `lib.rs` + `tauri-plugin-global-shortcut` |
| P2 | 深色模式跟随系统 | ✅ 自动 | Tailwind v4 `prefers-color-scheme` + WebView2 |
| P2 | 离线模式引导 | 🔄 基础就绪 | SQLite 缓存 + SyncStore，Store 集成待完善 |

---

## 文件清单

```
src-tauri/
├── Cargo.toml              # Rust 依赖（tauri v2.11, rusqlite, reqwest, serde, chrono）
├── tauri.conf.json         # 窗口 1200×800, identifier: com.notifications.app
├── capabilities/
│   └── default.json        # 权限：notification/autostart/global-shortcut/window
├── icons/                  # 应用图标（多尺寸）
├── src/
│   ├── main.rs             # 入口
│   ├── lib.rs              # 插件注册 + 托盘 + 快捷键 + 窗口关闭→隐藏
│   ├── tray.rs             # 系统托盘（右键菜单：打开/同步/退出，左键恢复）
│   ├── commands.rs         # 8 个 Tauri Commands
│   ├── db.rs               # SQLite（notifications/categories/sync_meta 三表）
│   ├── sync.rs             # Bmob REST API 同步引擎（增量同步）
│   └── notify.rs           # 桌面通知封装
└── build.rs

src/
├── api/
│   └── tauri.js            # Tauri Bridge — 封装 invoke，浏览器降级
└── stores/
    └── sync.js             # 同步状态 Store（在线/离线/同步中/托盘监听）
```

---

## 开发命令

```bash
npm run tauri:dev           # 启动 Tauri 开发模式（Vite HMR + 原生窗口）
npm run tauri:build         # 构建生产安装包（.msi/.exe）
npm run build               # 仅构建 Web 版本
```

---

## 关键技术细节

### Rust Commands（8 个）

| Command | 参数 | 返回值 | 用途 |
|---|---|---|---|
| `send_notification` | title, body, id | - | 系统桌面通知 |
| `sync_now` | - | SyncResult | 手动触发 Bmob → SQLite 同步 |
| `get_sync_status` | - | SyncStatusPayload | 查询同步状态 |
| `get_cached_notification` | id | Notification\|null | 本地缓存单条通知 |
| `get_cached_notifications` | type_filter | Notification[] | 本地缓存通知列表 |
| `get_cached_categories` | - | Category[] | 本地缓存分类 |
| `set_autostart` | enabled | - | 开关开机自启 |
| `get_autostart` | - | bool | 查询开机自启状态 |

### SQLite Schema

```sql
notifications (id, title, content, type, source_group, source_person, original_link,
               priority, tags, status, deadline, created_at, updated_at, deleted, deleted_at)
categories    (id, name, value, icon, color, sort_order, is_active)
sync_meta     (key, value)  -- last_sync_at
```

### 同步引擎策略

1. 从 Bmob REST API 获取 `updatedAt > lastSyncAt` 的数据（增量同步）
2. 写入 SQLite（`INSERT OR REPLACE`）
3. 更新 `sync_meta.last_sync_at`
4. 网络失败时静默降级，保留上次缓存

### 环境变量（Bmob 密钥）

Rust 端从 `VITE_BMOB_SECRET_KEY` 和 `VITE_BMOB_API_SAFE_CODE` 环境变量读取 Bmob 密钥。

---

## 待办/改进

- [ ] Store 层集成：`notificationStore.fetchList()` 检测 Tauri → 优先读 SQLite
- [ ] 构建验证：在 CI 或目标机器运行 `npm run tauri:build`
- [ ] 图标替换：替换为项目专属图标
- [ ] 托盘图标自定义：当前使用默认应用图标
