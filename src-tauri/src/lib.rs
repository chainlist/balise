mod commands;
mod sync;

use tauri::Manager;
use tauri_plugin_window_state::StateFlags;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all().difference(StateFlags::VISIBLE))
                .with_denylist(&["quick"])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::file_sync::scan_desk_files,
            commands::file_sync::read_desk_files_content,
            commands::file_sync::set_desk_file_mtime,
            commands::device::device_id,
            sync::start_sync,
            sync::stop_sync,
            sync::pair_device,
            sync::respond_pairing,
            sync::sync_open,
            sync::sync_send,
            sync::sync_recv,
            sync::sync_close
        ])
        .manage(sync::SyncState::default())
        .manage(sync::PairingState::default())
        .manage(sync::SyncSessions::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        // iroh's networking crates log every packet at INFO; keep
                        // only warnings/errors so our own logs stay readable.
                        .level_for("iroh", log::LevelFilter::Warn)
                        .level_for("iroh_relay", log::LevelFilter::Warn)
                        .level_for("netwatch", log::LevelFilter::Warn)
                        .level_for("portmapper", log::LevelFilter::Warn)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();
            let main_window = app
                .get_webview_window("main")
                .expect("main window not found");
            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::Destroyed = event {
                    app_handle.exit(0);
                }
            });
            main_window.show()?;

            if let Some(quick_window) = app.get_webview_window("quick") {
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
