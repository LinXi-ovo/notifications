use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

/// 构建系统托盘
pub fn build_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单项
    let show_item = MenuItem::with_id(app, "show", "打开窗口", true, None::<&str>)?;
    let sync_item = MenuItem::with_id(app, "sync", "立即同步", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &sync_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("通知聚合")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                // 显示主窗口
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "sync" => {
                log::info!("托盘菜单：触发同步");
                // 触发同步（通过 Tauri 事件通知前端）
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-sync", ());
                }
            }
            "quit" => {
                log::info!("托盘菜单：退出应用");
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // 左键单击恢复窗口
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
