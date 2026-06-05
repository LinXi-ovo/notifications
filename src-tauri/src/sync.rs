use crate::db;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Bmob REST API 响应
#[derive(Debug, Deserialize)]
#[allow(non_snake_case)]
pub struct BmobResponse<T> {
    pub results: Vec<T>,
}

/// Bmob 通知记录
#[derive(Debug, Deserialize, Clone)]
#[allow(non_snake_case)]
pub struct BmobNotification {
    #[serde(default)]
    pub objectId: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(rename = "type", default)]
    pub type_: Option<String>,
    #[serde(default)]
    pub sourceGroup: Option<String>,
    #[serde(default)]
    pub sourcePerson: Option<String>,
    #[serde(default)]
    pub originalLink: Option<String>,
    #[serde(default)]
    pub priority: Option<i32>,
    #[serde(default)]
    pub tags: Option<serde_json::Value>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub deadline: Option<String>,
    #[serde(default)]
    pub createdAt: Option<String>,
    #[serde(default)]
    pub updatedAt: Option<String>,
    #[serde(default)]
    pub deleted: Option<bool>,
    #[serde(default)]
    pub deletedAt: Option<serde_json::Value>,
}

/// Bmob 分类记录
#[derive(Debug, Deserialize, Clone)]
#[allow(non_snake_case, dead_code)]
pub struct BmobCategory {
    #[serde(default)]
    pub objectId: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub value: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub sortOrder: Option<i32>,
    #[serde(default)]
    pub isActive: Option<bool>,
    #[serde(default)]
    pub updatedAt: Option<String>,
}

/// 同步结果
#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub notifications_synced: usize,
    pub categories_synced: usize,
    pub notification_count: i64,
    pub category_count: i64,
    pub online: bool,
    pub last_sync_at: String,
}

// 从环境变量读取 Bmob 密钥（在 Rust 编译时注入）
// 实际运行时通过 Tauri 配置传入，避免编译期硬编码
fn get_bmob_keys() -> (String, String) {
    let secret_key = std::env::var("VITE_BMOB_SECRET_KEY")
        .unwrap_or_else(|_| String::new());
    let api_safe_code = std::env::var("VITE_BMOB_API_SAFE_CODE")
        .unwrap_or_else(|_| String::new());
    (secret_key, api_safe_code)
}

/// 发送 Bmob REST API 请求
async fn fetch_from_bmob<T: for<'de> Deserialize<'de>>(
    endpoint: &str,
    last_sync: Option<&str>,
) -> Result<Vec<T>, String> {
    let (app_id, rest_key) = get_bmob_keys();
    if app_id.is_empty() || rest_key.is_empty() {
        return Err("Bmob 密钥未配置，请在环境变量中设置 VITE_BMOB_SECRET_KEY 和 VITE_BMOB_API_SAFE_CODE".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("https://api.bmobcloud.com/1/classes/{}", endpoint);

    let mut req = client
        .get(&url)
        .header("X-Bmob-Application-Id", &app_id)
        .header("X-Bmob-REST-API-Key", &rest_key);

    // 增量同步：只拉取 updatedAt 之后的数据
    if let Some(since) = last_sync {
        let where_clause = serde_json::json!({
            "updatedAt": {
                "$gte": since
            }
        });
        req = req.query(&[("where", where_clause.to_string().as_str())]);
    }

    // 增加 limit 以获取更多数据
    req = req.query(&[("limit", "200")]);

    let resp = req.send().await.map_err(|e| format!("网络请求失败: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Bmob API 错误 ({}): {}", status, text));
    }

    let data = resp
        .json::<BmobResponse<T>>()
        .await
        .map_err(|e| format!("JSON 解析失败: {}", e))?;

    Ok(data.results)
}

/// 从 Bmob 同步通知和分类到本地 SQLite
pub async fn sync_from_bmob(
    db_path: &Path,
) -> Result<SyncResult, String> {
    let now = Utc::now().to_rfc3339();

    // 获取上次同步时间
    let last_sync = db::get_sync_meta(db_path, "last_sync_at").ok().flatten();
    log::info!("开始 Bmob 同步，上次同步时间: {:?}", last_sync);

    // ── 同步通知 ──
    let bmob_notifications: Vec<BmobNotification> = match fetch_from_bmob(
        "Notifications",
        last_sync.as_deref(),
    )
    .await
    {
        Ok(data) => {
            log::info!("从 Bmob 获取到 {} 条通知", data.len());
            data
        }
        Err(e) => {
            log::error!("同步通知失败: {}", e);
            return Err(e);
        }
    };

    let notifications: Vec<db::Notification> = bmob_notifications
        .into_iter()
        .map(|n| {
            let tags_str = n.tags.map(|t| t.to_string());
            db::Notification {
                id: n.objectId,
                title: n.title,
                content: n.content,
                type_: n.type_,
                source_group: n.sourceGroup,
                source_person: n.sourcePerson,
                original_link: n.originalLink,
                priority: n.priority,
                tags: tags_str,
                status: n.status,
                deadline: n.deadline,
                created_at: n.createdAt,
                updated_at: n.updatedAt,
                deleted: Some(if n.deleted.unwrap_or(false) { 1 } else { 0 }),
                deleted_at: n.deletedAt.map(|v| v.to_string()),
            }
        })
        .collect();

    let notif_count = notifications.len();
    db::save_notifications(db_path, &notifications)?;

    // ── 同步分类 ──
    let bmob_categories: Vec<BmobCategory> = match fetch_from_bmob(
        "Category",
        last_sync.as_deref(),
    )
    .await
    {
        Ok(data) => {
            log::info!("从 Bmob 获取到 {} 条分类", data.len());
            data
        }
        Err(e) => {
            log::warn!("同步分类失败: {}（跳过，不影响通知同步）", e);
            Vec::new()
        }
    };

    let categories: Vec<db::Category> = bmob_categories
        .into_iter()
        .map(|c| db::Category {
            id: c.objectId,
            name: c.name,
            value: c.value,
            icon: c.icon,
            color: c.color,
            sort_order: c.sortOrder,
            is_active: Some(if c.isActive.unwrap_or(true) { 1 } else { 0 }),
        })
        .collect();

    let cat_count = categories.len();
    if !categories.is_empty() {
        db::save_categories(db_path, &categories)?;
    }

    // ── 更新同步时间戳 ──
    db::set_sync_meta(db_path, "last_sync_at", &now)?;

    // ── 获取计数 ──
    let total_notifications = db::get_notification_count(db_path).unwrap_or(0);
    let total_categories = db::get_category_count(db_path).unwrap_or(0);

    log::info!(
        "同步完成: {} 条通知, {} 条分类",
        notif_count,
        cat_count
    );

    Ok(SyncResult {
        notifications_synced: notif_count,
        categories_synced: cat_count,
        notification_count: total_notifications,
        category_count: total_categories,
        online: true,
        last_sync_at: now,
    })
}
