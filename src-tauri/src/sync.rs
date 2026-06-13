use std::sync::Mutex;

use iroh::{endpoint::presets, Endpoint, SecretKey};
use tauri::{AppHandle, Manager};

use crate::commands::device::load_or_create_signing_key;

/// ALPN identifying Balise's note-sync protocol over QUIC.
const SYNC_ALPN: &[u8] = b"balise/sync/0";

/// Holds the running iroh endpoint while sync is enabled, `None` when it is off.
/// Registered as Tauri managed state in `lib.rs`.
#[derive(Default)]
pub struct SyncState(Mutex<Option<Endpoint>>);

/// Starts the iroh networking layer using this device's persisted Ed25519 seed
/// as its node identity. No-op if already running.
async fn start(app: &AppHandle) -> Result<(), String> {
    if app.state::<SyncState>().0.lock().unwrap().is_some() {
        return Ok(());
    }

    let endpoint = bind(app).await?;
    log::info!("iroh endpoint started: {}", endpoint.id());
    *app.state::<SyncState>().0.lock().unwrap() = Some(endpoint);
    Ok(())
}

/// Stops the iroh networking layer, shutting down the QUIC socket, relay link
/// and discovery. No-op if not running.
async fn stop(app: &AppHandle) {
    let endpoint = app.state::<SyncState>().0.lock().unwrap().take();
    if let Some(endpoint) = endpoint {
        endpoint.close().await;
        log::info!("iroh endpoint stopped");
    }
}

/// Binds an iroh endpoint on n0's default relays and discovery.
async fn bind(app: &AppHandle) -> Result<Endpoint, String> {
    let seed = load_or_create_signing_key(app)?.to_bytes();
    let secret_key = SecretKey::from_bytes(&seed);

    Endpoint::builder(presets::N0)
        .secret_key(secret_key)
        .alpns(vec![SYNC_ALPN.to_vec()])
        .bind()
        .await
        .map_err(|e| e.to_string())
}

/// Starts sync. Invoked by the frontend when the user enables sync and, on
/// launch, when sync was previously enabled.
#[tauri::command]
pub async fn start_sync(app: AppHandle) -> Result<(), String> {
    start(&app).await
}

/// Stops sync. Invoked by the frontend when the user disables sync.
#[tauri::command]
pub async fn stop_sync(app: AppHandle) {
    stop(&app).await;
}
