use serde::Serialize;

#[allow(dead_code)]
/// 通知记录（用于历史追踪）
#[derive(Debug, Serialize)]
pub struct NotificationRecord {
    pub title: String,
    pub body: String,
    pub notification_id: String,
    pub sent_at: String,
    pub source: String,
}

/// 发送桌面通知（封装 tauri-plugin-notification）
/// 实际的发送通过 commands::send_notification 完成
/// 此模块负责记录通知发送历史（可扩展到 SQLite 存储）
#[allow(dead_code)]
pub fn record_notification(title: &str, body: &str, id: &str) -> NotificationRecord {
    let record = NotificationRecord {
        title: title.to_string(),
        body: body.to_string(),
        notification_id: id.to_string(),
        sent_at: chrono::Utc::now().to_rfc3339(),
        source: "notifications-aggregator".to_string(),
    };
    log::info!("桌面通知已发送: {} — {}", title, body);
    record
}
