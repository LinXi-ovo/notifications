# Tauri 桌面应用 — 架构设计 · v1.0

## 架构全景

Tauri Window (系统 WebView) 内嵌 Vue 3 SPA，通过 Tauri invoke() 与 Rust 后端通信。Rust 后端提供：窗口管理、系统托盘、SQLite 离线缓存、Bmob 同步引擎、桌面通知、开机自启、全局快捷键、深色模式、文件缓存。



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

