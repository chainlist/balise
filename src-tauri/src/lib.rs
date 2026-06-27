mod commands;
mod sync;

use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
#[cfg(desktop)]
use tauri_plugin_window_state::StateFlags;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build());

    // Desktop-only plugins: these crates are not compiled for android/ios
    // (see Cargo.toml target gating), so they must not be registered on mobile.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all().difference(StateFlags::VISIBLE))
                .with_denylist(&["quick"])
                .build(),
        );

    builder
        .invoke_handler(tauri::generate_handler![
            commands::file_sync::set_desk_file_mtime,
            commands::attachments::copy_attachment,
            commands::fonts::list_fonts,
            sync::sync_desk_files,
            sync::migrate_desk_db,
            commands::device::device_id,
            commands::device::public_key_hex,
            commands::device::sign_challenge,
            commands::device::device_id_from_public_key,
            sync::start_sync,
            sync::stop_sync,
            sync::set_sync_config,
            sync::sync_peers
        ])
        .manage(sync::SyncState::default())
        .manage(sync::SyncConfig::default())
        .manage(sync::InFlightPeers::default())
        .manage(sync::SyncActivity::default())
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

            // The main window is declared with `"create": false` in
            // tauri.conf.json so we can build it here and attach a new-window
            // handler. Embedded players (YouTube/Vimeo/Dailymotion) open their
            // "watch on…" / title / channel links via target="_blank"; intercept
            // those, hand them to the system browser, and deny the in-app popup.
            let main_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|w| w.label == "main")
                .expect("main window config not found")
                .clone();
            let opener_handle = app.handle().clone();
            tauri::webview::WebviewWindowBuilder::from_config(app.handle(), &main_config)?
                .on_new_window(move |url, _features| {
                    let _ = opener_handle.opener().open_url(url.to_string(), None::<&str>);
                    tauri::webview::NewWindowResponse::Deny
                })
                .build()?;

            let app_handle = app.handle().clone();
            let main_window = app
                .get_webview_window("main")
                .expect("main window not found");

            // macOS keeps its native decorations so the Overlay title bar
            // (tauri.conf.json) can draw the traffic-light buttons; every other
            // platform uses the in-app window controls, so strip the OS frame
            // here. Done in Rust (not JS) so the native title bar never flashes
            // before the webview takes over.
            #[cfg(not(target_os = "macos"))]
            let _ = main_window.set_decorations(false);

            main_window.on_window_event(move |event| {
                if let tauri::WindowEvent::Destroyed = event {
                    app_handle.exit(0);
                }
            });

            #[cfg(target_os = "macos")]
            if let Some(quick_window) = app.get_webview_window("quick") {
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
