# Tauri 桌面应用  — 架构设计 · v1.0

> 将现有 Vue 3 + Bmob SPA 打包为 Tauri 原生桌面应用。

---

## 核心实现细节

### 1. Rust Command 示例

```rust
#[tauri::command]
pub async fn get_cached_notification(
    app: AppHandle,
    id: String,
) -> Result<Option<Notification>, String> {
    let db = db::Database::new(&app)?;
    db.get_notification(&id).map_err(|e| e.to_string())
}
```

### 2. SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT,
    status TEXT DEFAULT 'active',
    deleted INTEGER DEFAULT 0
);
```

### 3. 前端适配策略

- **环境检测**: `typeof window !== 'undefined' && '__TAURI__' in window`
- **渐进增强**: 浏览器保留全部现有功能，Tauri 额外获得原生能力
