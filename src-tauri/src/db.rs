use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// 获取数据库文件路径（在应用数据目录下）
pub fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("无法获取应用数据目录");
    std::fs::create_dir_all(&app_dir).ok();
    app_dir.join("notifications.db")
}

/// 初始化数据库，创建所有必要的表
pub fn initialize_database(db_path: &std::path::Path) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            type TEXT,
            source_group TEXT,
            source_person TEXT,
            original_link TEXT,
            priority INTEGER DEFAULT 0,
            tags TEXT,
            status TEXT DEFAULT 'active',
            deadline TEXT,
            created_at TEXT,
            updated_at TEXT,
            deleted INTEGER DEFAULT 0,
            deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT,
            value TEXT,
            icon TEXT,
            color TEXT,
            sort_order INTEGER,
            is_active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS sync_meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    log::info!("数据库初始化成功: {:?}", db_path);
    Ok(())
}

// ── 数据结构 ──

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub content: Option<String>,
    #[serde(rename = "type")]
    pub type_: Option<String>,
    pub source_group: Option<String>,
    pub source_person: Option<String>,
    pub original_link: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<String>,
    pub status: Option<String>,
    pub deadline: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted: Option<i32>,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: Option<String>,
    pub value: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: Option<i32>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncMeta {
    pub key: String,
    pub value: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatus {
    pub online: bool,
    pub last_sync_at: Option<String>,
    pub notification_count: i64,
    pub category_count: i64,
}

// ── 通知 CRUD ──

pub fn save_notifications(
    db_path: &std::path::Path,
    notifications: &[Notification],
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    for n in notifications {
        tx.execute(
            "INSERT OR REPLACE INTO notifications
             (id, title, content, type, source_group, source_person, original_link,
              priority, tags, status, deadline, created_at, updated_at, deleted, deleted_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            rusqlite::params![
                n.id,
                n.title,
                n.content,
                n.type_,
                n.source_group,
                n.source_person,
                n.original_link,
                n.priority,
                n.tags,
                n.status,
                n.deadline,
                n.created_at,
                n.updated_at,
                n.deleted.unwrap_or(0),
                n.deleted_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_notifications(
    db_path: &std::path::Path,
    type_filter: Option<&str>,
) -> Result<Vec<Notification>, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut sql = "SELECT * FROM notifications WHERE deleted = 0".to_string();
    let _params: Vec<String> = Vec::new();

    if let Some(t) = type_filter {
        sql.push_str(&format!(" AND type = '{}'", t.replace('\'', "''")));
    }
    sql.push_str(" ORDER BY priority DESC, created_at DESC LIMIT 200");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Notification {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                type_: row.get(3)?,
                source_group: row.get(4)?,
                source_person: row.get(5)?,
                original_link: row.get(6)?,
                priority: row.get(7)?,
                tags: row.get(8)?,
                status: row.get(9)?,
                deadline: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                deleted: row.get(13)?,
                deleted_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn get_notification_by_id(
    db_path: &std::path::Path,
    id: &str,
) -> Result<Option<Notification>, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM notifications WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map(rusqlite::params![id], |row| {
            Ok(Notification {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                type_: row.get(3)?,
                source_group: row.get(4)?,
                source_person: row.get(5)?,
                original_link: row.get(6)?,
                priority: row.get(7)?,
                tags: row.get(8)?,
                status: row.get(9)?,
                deadline: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                deleted: row.get(13)?,
                deleted_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    match rows.next() {
        Some(Ok(n)) => Ok(Some(n)),
        _ => Ok(None),
    }
}

// ── 分类 CRUD ──

pub fn save_categories(
    db_path: &std::path::Path,
    categories: &[Category],
) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    for c in categories {
        tx.execute(
            "INSERT OR REPLACE INTO categories
             (id, name, value, icon, color, sort_order, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                c.id,
                c.name,
                c.value,
                c.icon,
                c.color,
                c.sort_order,
                c.is_active.unwrap_or(1),
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_categories(db_path: &std::path::Path) -> Result<Vec<Category>, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT * FROM categories ORDER BY sort_order")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                value: row.get(2)?,
                icon: row.get(3)?,
                color: row.get(4)?,
                sort_order: row.get(5)?,
                is_active: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ── 同步元数据 ──

pub fn get_sync_meta(db_path: &std::path::Path, key: &str) -> Result<Option<String>, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT value FROM sync_meta WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map(rusqlite::params![key], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    match rows.next() {
        Some(Ok(v)) => Ok(Some(v)),
        _ => Ok(None),
    }
}

pub fn set_sync_meta(db_path: &std::path::Path, key: &str, value: &str) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?1, ?2)",
        rusqlite::params![key, value],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_notification_count(db_path: &std::path::Path) -> Result<i64, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT COUNT(*) FROM notifications WHERE deleted = 0",
        [],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

pub fn get_category_count(db_path: &std::path::Path) -> Result<i64, String> {
    let conn = rusqlite::Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))
        .map_err(|e| e.to_string())
}
