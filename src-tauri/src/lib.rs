mod commands;
mod db;
mod notify;
mod sync;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|_app, _shortcut, _event| {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            })
            .build()
        )
        .setup(|app| {
            // 初始化 SQLite 数据库
            let app_handle = app.handle().clone();
            let db_path = db::get_db_path(&app_handle);
            if let Err(e) = db::initialize_database(&db_path) {
                log::error!("数据库初始化失败: {}", e);
            }

            // 构建系统托盘
            tray::build_tray(app.handle())?;

            // 注册全局快捷键 Ctrl+Shift+空格 → 唤出窗口
            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers};
            if let Err(e) = app.global_shortcut().register(
                tauri_plugin_global_shortcut::Shortcut::new(
                    Some(Modifiers::CONTROL | Modifiers::SHIFT),
                    Code::Space,
                ),
            ) {
                log::warn!("全局快捷键注册失败（可能已被其他程序占用）: {}", e);
            }


            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 关闭请求时隐藏到托盘（而非退出）
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::send_notification,
            commands::sync_now,
            commands::get_sync_status,
            commands::get_cached_notifications,
            commands::get_cached_categories,
            commands::set_autostart,
            commands::get_autostart,
            commands::get_cached_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
