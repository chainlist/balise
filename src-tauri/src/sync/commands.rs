//! The Tauri command surface for sync: enable/disable, push config, and the
//! best-effort dial cycle (the initiator side).

use iroh::{Endpoint, EndpointAddr};
use tauri::{AppHandle, Manager};

use super::extract::MagicTag;
use super::protocol::{emit_result, run_protocol};
use super::transport::{
    local_device_id, parse_device_id, start, stop, SyncConfig, SyncConfigData, SyncRunning,
    SyncState, SYNC_DATA_ALPN,
};

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

/// Pushes the frontend's current trust set + share/tag config into Rust so the
/// dialer and the autonomous accept loop both run with fresh state.
#[tauri::command]
pub fn set_sync_config(
    app: AppHandle,
    peers: Vec<String>,
    unshared: Vec<String>,
    magic_tags: Vec<MagicTag>,
) {
    *app.state::<SyncConfig>().0.lock().unwrap() = SyncConfigData {
        peers,
        unshared,
        magic_tags,
    };
}

/// Dials every paired peer in turn and reconciles all shared desks. Best-effort:
/// one peer being offline can't abort the rest. Skips if a cycle is already running.
#[tauri::command]
pub async fn run_sync(app: AppHandle) -> Result<(), String> {
    let running = app.state::<SyncRunning>();
    let Some(_guard) = running.try_begin() else {
        return Ok(()); // a cycle is already running
    };
    run_sync_inner(&app).await
}

async fn run_sync_inner(app: &AppHandle) -> Result<(), String> {
    let endpoint = app
        .state::<SyncState>()
        .0
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "sync is not running".to_string())?;
    let local_id = local_device_id(app)?;
    let cfg = app.state::<SyncConfig>().0.lock().unwrap().clone();

    for peer_id in &cfg.peers {
        if let Err(e) = sync_with_peer(app, &endpoint, &local_id, peer_id, &cfg).await {
            // A peer that's offline or unreachable is expected; don't surface it.
            log::warn!("sync with {peer_id} failed: {e}");
        }
    }
    Ok(())
}

async fn sync_with_peer(
    app: &AppHandle,
    endpoint: &Endpoint,
    local_id: &str,
    peer_id: &str,
    cfg: &SyncConfigData,
) -> Result<(), String> {
    let peer_pk = parse_device_id(peer_id)?;
    let connection = endpoint
        .connect(EndpointAddr::from(peer_pk), SYNC_DATA_ALPN)
        .await
        .map_err(|e| e.to_string())?;
    let (mut send, mut recv) = connection.open_bi().await.map_err(|e| e.to_string())?;
    let outcome = run_protocol(
        app,
        local_id,
        peer_id,
        &mut send,
        &mut recv,
        &cfg.unshared,
        &cfg.magic_tags,
    )
    .await?;
    emit_result(app, peer_id, outcome);
    Ok(())
}
