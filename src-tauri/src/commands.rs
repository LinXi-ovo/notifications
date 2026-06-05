use serde::Serialize;
use tauri::AppHandle;

use crate::db;
use crate::sync;

/// 同步状态（给前端查询）
#[derive(Debug, Serialize)]
pub struct SyncStatusPayload {
    pub online: bool,
    pub last_sync_at: Option<String>,
    pub notification_count: i64,
    pub category_count: i64,
}

/// 发送系统桌面通知
#[tauri::command]
pub async fn send_notification(
    app: AppHandle,
    title: String,
    body: String,
    _id: String,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("发送通知失败: {}", e))
}

/// 手动触发 Bmob → SQLite 同步
#[tauri::command]
pub async fn sync_now(app: AppHandle) -> Result<sync::SyncResult, String> {
    let db_path = db::get_db_path(&app);
    sync::sync_from_bmob(&db_path).await
}

/// 获取同步状态
#[tauri::command]
pub async fn get_sync_status(app: AppHandle) -> Result<SyncStatusPayload, String> {
    let db_path = db::get_db_path(&app);

    let last_sync_at = db::get_sync_meta(&db_path, "last_sync_at")
        .ok()
        .flatten();
    let notification_count = db::get_notification_count(&db_path).unwrap_or(0);
    let category_count = db::get_category_count(&db_path).unwrap_or(0);

    Ok(SyncStatusPayload {
        online: true,
        last_sync_at,
        notification_count,
        category_count,
    })
}

/// 获取缓存的单条通知
#[tauri::command]
pub async fn get_cached_notification(
    app: AppHandle,
    id: String,
) -> Result<Option<db::Notification>, String> {
    let db_path = db::get_db_path(&app);
    db::get_notification_by_id(&db_path, &id)
}

/// 获取缓存的通知列表
#[tauri::command]
pub async fn get_cached_notifications(
    app: AppHandle,
    type_filter: Option<String>,
) -> Result<Vec<db::Notification>, String> {
    let db_path = db::get_db_path(&app);
    db::get_notifications(&db_path, type_filter.as_deref())
}

/// 获取缓存的分类
#[tauri::command]
pub async fn get_cached_categories(
    app: AppHandle,
) -> Result<Vec<db::Category>, String> {
    let db_path = db::get_db_path(&app);
    db::get_categories(&db_path)
}

/// 设置开机自启
#[tauri::command]
pub async fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| format!("启用自启失败: {}", e))?;
    } else {
        manager.disable().map_err(|e| format!("禁用自启失败: {}", e))?;
    }
    Ok(())
}

/// 获取开机自启状态
#[tauri::command]
pub async fn get_autostart(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    manager.is_enabled().map_err(|e| format!("获取自启状态失败: {}", e))
}
