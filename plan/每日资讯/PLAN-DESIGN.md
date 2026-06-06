好的，我直接发内容，你复制粘贴到两个文件里。

PLAN-DESIGN.md

# Tauri 桌面应用 — 架构设计 · v1.0

> 将现有 Vue 3 + Bmob SPA 打包为 Tauri 原生桌面应用，保留全部现有功能，新增系统托盘、桌面通知、离线能力。

---

## 核心原理：为什么 Tauri 能做到"一行不改"

现有项目是 Vite 构建的纯静态 SPA（HTML + JS + CSS）。Tauri 的核心机制：

Vite build → dist/ (静态文件)
↓
Tauri 读取 dist/ → 在系统 WebView 中加载
↓
Rust 后端 (src-tauri/)
提供系统级 API 给前端调用



| 层级 | 技术 | 职责 |
|---|---|---|
| 前端（不变） | Vue 3 + Tailwind | UI 渲染、路由、状态管理 |
| 桥接层 | Tauri Commands (Rust → JS) | 系统通知、托盘、文件读写 |
| 后端 | Rust (src-tauri/) | 窗口管理、托盘、SQLite 离线缓存、Bmob 同步 |

**不需要改动**：`src/` 下的 Vue 组件、路由、Store、API 调用全部原封不动。

---

## 架构全景

┌─────────────────────────────────────────────────┐
│  Tauri Window (系统 WebView)                     │
│  ┌───────────────────────────────────────────┐  │
│  │  Vue 3 SPA (现有代码，零修改)              │  │
│  │  ┌─────────┐ ┌──────┐ ┌──────────┐      │  │
│  │  │ 组件     │ │ Store │ │ API 层   │      │  │
│  │  └─────────┘ └──────┘ └──────────┘      │  │
│  │         ↕ Tauri invoke()                  │  │
│  └───────────────────────────────────────────┘  │
│                        │                        │
├─────────────────────────────────────────────────┤
│  Rust 后端 (Rust)                               │
│  ┌──────────┐ ┌────────┐ ┌────────────────┐    │
│  │ 窗口管理  │ │系统托盘│ │ SQLite 离线缓存 │    │
│  │ Window   │ │ Tray   │ │ rusqlite       │    │
│  ├──────────┤ ├────────┤ ├────────────────┤    │
│  │ 桌面通知  │ │开机自启│ │ Bmob 同步引擎  │    │
│  │ Notify   │ │Autostart│ │ Sync Engine    │    │
│  ├──────────┤ ├────────┤ ├────────────────┤    │
│  │ 全局快捷键 │ │深色模式│ │ 文件缓存 (COS) │    │
│  │ Shortcut  │ │Theme   │ │ File Cache     │    │
│  └──────────┘ └────────┘ └────────────────┘    │
└─────────────────────────────────────────────────┘



---

## 数据流变化

### 当前（纯浏览器）

Vue → Bmob SDK → HTTPS → Bmob 云端 → 响应 → Vue
↕
localStorage (少量缓存)



### Tauri 模式

Vue → Tauri invoke() → Rust Command
├── SQLite (离线优先)
├── Bmob API (云端同步)
└── 系统通知 (桌面弹窗)



### 用户可见的变化

| 场景 | 当前 | Tauri 后 |
|---|---|---|
| 启动 | 打开浏览器 → 输入 URL → 加载 | 双击图标 → 瞬间弹出 |
| 通知提醒 | 无（需自己看网页） | Windows 托盘弹窗 + 声音 |
| 离线 | 白屏 | 加载本地缓存数据 |
| 文件大小 | 依赖浏览器 | ~5MB 安装包 |
| 后台运行 | 关浏览器就没了 | 托盘常驻，最小化到托盘 |

---

## 文件清单

### 新增 Rust 文件（src-tauri/）

src-tauri/
├── Cargo.toml                 # Rust 依赖清单
├── tauri.conf.json            # Tauri 配置（窗口、权限、打包）
├── capabilities/              # 权限配置文件
│   └── default.json
├── icons/                     # 应用图标（.ico .png）
├── src/
│   ├── main.rs                # 入口：窗口创建 + 托盘初始化
│   ├── tray.rs                # 系统托盘（图标、右键菜单）
│   ├── commands.rs            # Tauri Commands（JS 可调用的 Rust 函数）
│   ├── db.rs                  # SQLite 离线缓存层
│   ├── sync.rs                # Bmob 同步引擎
│   ├── notify.rs              # 桌面通知封装
│   └── autostart.rs           # 开机自启管理
└── build.rs                   # Tauri 构建脚本



### 新增/修改的 JS 文件

src/
├── api/
│   └── tauri.js               # [新增] Tauri Bridge — 封装 invoke() 调用
├── stores/
│   └── sync.js                # [新增] 同步状态 store（在线/离线/上次同步时间）
└── ...



---

## 核心实现细节

### 1. Rust Command 示例

```rust
// src-tauri/src/commands.rs
use tauri::AppHandle;

/// 获取本地缓存的某条通知
#[tauri::command]
pub async fn get_cached_notification(
    app: AppHandle,
    id: String,
) -> Result<Option<Notification>, String> {
    let db = db::Database::new(&app)?;
    db.get_notification(&id).map_err(|e| e.to_string())
}

/// 将 Bmob 数据写入本地 SQLite
#[tauri::command]
pub async fn sync_to_local(app: AppHandle) -> Result<SyncResult, String> {
    let data = bmob::fetch_all().await.map_err(|e| e.to_string())?;
    let db = db::Database::new(&app)?;
    db.save_notifications(&data.notifications)?;
    db.save_categories(&data.categories)?;
    Ok(SyncResult { count: data.notifications.len() })
}
2. JS 端调用

// src/api/tauri.js — 对 Vue 组件透明的封装
import { invoke } from '@tauri-apps/api/core'

export async function getCachedNotification(id) {
  return await invoke('get_cached_notification', { id })
}
现有的 src/api/ 文件不改，新增 tauri.js 提供 Tauri-only 能力。浏览器环境自动降级。

3. 系统托盘

// src-tauri/src/tray.rs
pub fn build_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let tray = TrayIconBuilder::new("notifications-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("通知聚合")
        .menu(
            Menu::with_items([
                &MenuItem::with_id("show", "打开窗口", true, None::<&str>),
                &MenuItem::with_id("sync", "立即同步", true, None::<&str>),
                &MenuItem::with_id("quit", "退出", true, None::<&str>),
            ]),
        )
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => { app.get_webview_window("main").unwrap().show().unwrap(); }
            "sync" => { /* 触发同步 */ }
            "quit" => { app.exit(0); }
            _ => {}
        })
        .build()?;
    Ok(())
}
4. SQLite 离线缓存 Schema

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT,
    source_group TEXT,
    source_person TEXT,
    priority INTEGER DEFAULT 0,
    tags TEXT,                  -- JSON 数组
    status TEXT DEFAULT 'active',
    deadline TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted INTEGER DEFAULT 0
);

-- 分类表（缓存 Bmob 的分类数据）
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT,
    value TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER,
    is_active INTEGER DEFAULT 1
);

-- 同步元数据
CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
实施路线

P0 ───────────── P1 ───────────── P2
│                 │                 │
├ Tauri 初始化    ├ 系统托盘        ├ 开机自启
├ 窗口管理        ├ SQLite 缓存     ├ 离线模式
├ dist 集成       ├ Bmob 同步       ├ 文件缓存
└ 开发体验        └ 桌面通知        └ 全局快捷键
P0 — Tauri 骨架（1 天）
任务	产出
安装 Tauri CLI + 初始化 src-tauri/	cargo init src-tauri + tauri init
配置 tauri.conf.json：窗口标题/尺寸/图标	窗口标题"通知聚合"，默认 1200×800
将 Vite build 接入 Tauri（beforeDevCommand / beforeBuildCommand）	npm run dev 自动启动 Tauri
验证：cargo tauri dev 能正常加载当前所有页面	开发环境可用
验证：cargo tauri build 产出安装包	可分发 .msi / .exe
P1 — 原生能力接入（2-3 天）
任务	产出	详情
1. 系统托盘	tray.rs	托盘图标、右键菜单（打开/同步/退出）、最小化到托盘
2. SQLite 缓存	db.rs	通知/分类/收藏的本地 CRUD，基于 rusqlite
3. Bmob 同步	sync.rs	同步引擎：Bmob 拉取 → 写入 SQLite；增量同步策略
4. 桌面通知	notify.rs	新通知 → 系统弹窗 + 可选声音；点击通知打开窗口
5. Tauri Bridge	src/api/tauri.js	封装 Tauri Commands，浏览器环境自动降级
P2 — 增强体验（2 天）
任务	产出	详情
1. 开机自启	autostart.rs	设置页开关控制，基于 tauri-plugin-autostart
2. 离线模式	修改 Store	检测 Tauri 环境 → 优先读 SQLite，Bmob 异步同步
3. 文件缓存	新增 src/api/file_cache.rs	COS 文件下载到本地，下次离线可用
4. 全局快捷键	main.rs	Ctrl+Shift+N 唤出窗口，基于 tauri-plugin-global-shortcut
5. 深色模式跟随系统	main.rs	监听系统主题变更，自动切换 Tailwind dark mode
前端适配策略
环境检测

// Tauri 环境判断（现有代码无需条件判断，新增功能可选）
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
渐进增强
功能	浏览器	Tauri
基本页面渲染	✅	✅ 完全一致
路由/登录/通知列表	✅	✅ 完全一致
Bmob 数据操作	✅ 直连	✅ 通过 Rust 代理或直连
系统托盘	❌	✅
桌面通知	❌（需 Service Worker）	✅ 原生通知
离线缓存	❌	✅ SQLite
开机自启	❌	✅
全局快捷键	❌	✅
所有现有功能在浏览器中完全不变。Tauri 版本额外获得原生能力。

与现有系统的关系
维度	说明
前端代码	零修改 — src/ 下所有 Vue/JS/CSS 原封不动
Bmob SDK	保留。Tauri 模式下可通过 Rust 代理调用，也可直接 JS 调用（WebView 支持 HTTPS）
路由	不变。仍使用 hash 路由
状态管理	不变。Pinia store 仍管理所有前端状态
每日资讯	不变。KnowledgeCard 在 Tauri 中仍为浮动卡片
构建流程	从 npm run build 变为 cargo tauri build（自动先跑 Vite build）
部署	从 Cloudflare Pages 变为分发 .exe 安装包。Web 版本继续保留


---

## PLAN-AI.md

```markdown
# Tauri 桌面应用 — AI 实施路线

> 将现有通知聚合器 Vue SPA 打包为 Tauri 原生桌面应用。
> 目标：保留 Web 版本不变，新增桌面原生体验。

---

## 环境准备

```bash
# 安装 Tauri CLI
npm install -D @tauri-apps/cli@latest

# 初始化 src-tauri（在项目根目录）
npx tauri init

# 安装前端 Tauri API
npm install @tauri-apps/api@latest
npm install @tauri-apps/plugin-notification@latest
npm install @tauri-apps/plugin-autostart@latest
npm install @tauri-apps/plugin-global-shortcut@latest

# 安装 Rust 依赖（自动写入 Cargo.toml）
cargo add tauri-plugin-notification tauri-plugin-autostart tauri-plugin-global-shortcut
cargo add rusqlite --features bundled
cargo add serde serde_json
P0 — Tauri 骨架（~1 天）
Step 1. 初始化 Tauri

npx tauri init
# 按照提示：
# - 应用名称: 通知聚合
# - 窗口标题: 通知聚合
# - Web 构建路径: ../dist
# - 开发服务器 URL: http://localhost:5173
# - 是否使用 TypeScript: 是
Step 2. 配置 tauri.conf.json

{
  "identifier": "com.notifications.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173"
  },
  "app": {
    "windows": [
      {
        "title": "通知聚合",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true
      }
    ]
  }
}
Step 3. 验证开发环境

# 启动 Tauri 开发模式（自动启动 Vite + Tauri 窗口）
cargo tauri dev
预期结果：Tauri 窗口弹出，显示当前 Web 应用的所有页面，路由/登录/列表全部正常。

Step 4. 验证构建

cargo tauri build
# 产出路径: src-tauri/target/release/bundle/msi/通知聚合_1.0.0_x64.msi
P1 — 原生能力（~3 天）
Step 1. 系统托盘（tray.rs）
文件：src-tauri/src/tray.rs

功能：

托盘图标（使用应用图标）
右键菜单：打开窗口 / 立即同步 / 退出
关闭窗口时最小化到托盘，而非退出
验收：

✅ 托盘图标在系统栏可见
✅ 右键弹出菜单
✅ 点击"打开窗口"恢复窗口
✅ 点击"退出"完全退出程序
✅ 点窗口 ✕ 按钮 → 最小化到托盘
Step 2. SQLite 离线缓存（db.rs）
文件：src-tauri/src/db.rs

功能：

SQLite 数据库初始化（notifications / categories / sync_meta 三张表）
通知 CRUD
分类缓存读写
同步时间戳管理
验收：

✅ 首次启动自动建表
✅ 写入/读取通知数据
✅ 写入/读取分类数据
✅ 数据持久化（重启后仍在）
Step 3. Bmob 同步引擎（sync.rs）
文件：src-tauri/src/sync.rs

功能：

从 Bmob 拉取通知/分类数据
写入 SQLite
增量同步（只拉取 updatedAt > lastSyncAt 的数据）
同步状态记录（sync_meta 表）
注意：Bmob SDK 是 JS 的，Rust 端同步需要直接调用 Bmob REST API（HTTPS 请求 + 签名）。这正好绕过了 hydrogen-js-sdk 的限制。


// REST API 调用示例
async fn fetch_from_bmob(endpoint: &str) -> Result<Vec<BmobRecord>, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("https://api.bmobcloud.com/1/classes/{}", endpoint))
        .header("X-Bmob-Application-Id", env!("BMOB_SECRET_KEY"))
        .header("X-Bmob-REST-API-Key", env!("BMOB_API_SAFE_CODE"))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let data = resp.json::<BmobResponse>().await.map_err(|e| e.to_string())?;
    Ok(data.results)
}
验收：

✅ 手动触发同步成功（通知/分类写入 SQLite）
✅ 增量同步正确（只同步变更的数据）
✅ 错误处理（网络断开时静默失败，保留上次缓存）
Step 4. 桌面通知（notify.rs）
文件：src-tauri/src/notify.rs

功能：

新通知到达时触发系统通知弹窗
通知内容：标题 + 来源
点击通知 → 激活窗口并跳转到对应通知详情

use tauri_plugin_notification::NotificationExt;

#[tauri::command]
pub async fn send_notification(app: AppHandle, title: String, body: String, id: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}
验收：

✅ 收到新通知时弹出系统通知
✅ 通知显示标题和内容
✅ 通知栏保留最近 N 条
Step 5. Tauri Bridge（tauri.js）
文件：src/api/tauri.js

功能：封装所有 Tauri invoke 调用，提供优雅的 JS API。


import { invoke } from '@tauri-apps/api/core'

export const tauri = {
  // 桌面通知
  notify: (title, body, id) =>
    invoke('send_notification', { title, body, id }),

  // 触发 Bmob 同步
  syncNow: () =>
    invoke('sync_now'),

  // 获取同步状态
  getSyncStatus: () =>
    invoke('get_sync_status'),

  // 开机自启
  setAutostart: (enabled) =>
    invoke('set_autostart', { enabled }),
  getAutostart: () =>
    invoke('get_autostart'),
}
P2 — 增强体验（~2 天）
Step 1. 开机自启
依赖：tauri-plugin-autostart


use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub async fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    let autostart = app.autostart();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}
Step 2. 离线模式
修改 store（非破坏性）：

notificationStore.fetchList()：检测 Tauri 环境 → 优先读 SQLite，Bmob 请求作为后台同步
新增 SyncStore：显示同步状态（在线/同步中/上次同步时间）

// stores/sync.js — 新增
export const useSyncStore = defineStore('sync', {
  state: () => ({
    online: navigator.onLine,
    lastSyncAt: null,
    syncing: false,
  }),
  actions: {
    async sync() {
      if (!isTauri) return
      this.syncing = true
      await tauri.syncNow()
      this.lastSyncAt = new Date().toISOString()
      this.syncing = false
    }
  }
})
Step 3. 全局快捷键

use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers};

app.global_shortcut()
    .register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyN))?
    .on_shortcut(move |app, event, _| {
        if event.id == shortcut_id {
            if let Some(window) = app.get_webview_window("main") {
                window.show().unwrap();
                window.set_focus().unwrap();
            }
        }
    });
风险与应对
风险	概率	影响	应对
WebView 兼容性（CSS 渲染差异）	低	中	使用 Edge WebView2，与 Chrome 内核一致
Bmob REST API 签名实现复杂	中	低	Rust 端可直接复现 JS SDK 的签名算法
旧 Windows 无 WebView2	低	高	安装包内嵌 WebView2 引导安装（~2MB）
cargo tauri build 打包慢	高	低	首次全量编译 5-10 分钟，后续增量快
离线 + 在线数据冲突	中	中	以 Bmob 为准，本地为缓存（Cache-aside）
验收标准
P0
 cargo tauri dev 正常启动，显示所有页面
 路由/登录/通知 CRUD/每日资讯/任务系统全部可用
 cargo tauri build 产出可安装的 .msi 文件
P1
 系统托盘：最小化到托盘、右键菜单
 桌面通知：新通知弹系统通知
 SQLite 缓存：通知/分类可离线读取
 Bmob 同步：手动触发可拉取最新数据
P2
 开机自启：设置页开关可控
 离线模式：断网时展示缓存数据
 全局快捷键：Ctrl+Shift+N 唤出窗口
 深色模式跟随系统


---

两个文件内容都在这儿了，你直接复制到：
- `PLAN-DESIGN.md` — Tauri 架构设计
- `PLAN-AI.md` — Tauri 实施路线

需要我继续讲某个具体部分，或者直接开始搭 Tauri 骨架吗？