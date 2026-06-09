mod commands;

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, ShortcutState};

fn open_quick_window(app: &tauri::AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window("quick") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.set_focus();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        open_quick_window(app);
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().with_denylist(&["quick"]).build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::file_sync::scan_desk_files,
            commands::file_sync::read_desk_files_content
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.handle().global_shortcut().register(
                tauri_plugin_global_shortcut::Shortcut::new(
                    Some(Modifiers::CONTROL | Modifiers::SHIFT),
                    Code::Space,
                ),
            )?;

            let app_handle = app.handle().clone();
            app.get_webview_window("main")
                .expect("main window not found")
                .on_window_event(move |event| {
                    if let tauri::WindowEvent::Destroyed = event {
                        app_handle.exit(0);
                    }
                });

            if let Some(quick_window) = app.get_webview_window("quick") {
                #[cfg(target_os = "windows")]
                let _ = window_vibrancy::apply_acrylic(&quick_window, Some((18, 18, 18, 50)));
                #[cfg(target_os = "macos")]
                let _ = window_vibrancy::apply_vibrancy(
                    &quick_window,
                    window_vibrancy::NSVisualEffectMaterial::HudWindow,
                    None,
                    Some(16.0),
                );
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
