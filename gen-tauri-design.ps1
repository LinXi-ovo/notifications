$path = "f:\Cores\project\web_code\notifications\plan\Tauri\PLAN-DESIGN.md"

$content = @'
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

**不需要改动**：src/ 下的 Vue 组件、路由、Store、API 调用全部原封不动。
'@
Set-Content -Path $path -Value $content
