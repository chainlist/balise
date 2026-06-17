//! The Tauri command surface for sync: enable/disable, push config, and the
//! best-effort dial cycle (the initiator side).

use std::time::Duration;

use iroh::{Endpoint, EndpointAddr};
use tauri::{AppHandle, Manager};

use super::extract::MagicTag;
use super::protocol::{emit_result, run_protocol};
use super::transport::{
    local_device_id, parse_device_id, start, stop, InFlightPeers, SyncActivity, SyncConfig,
    SyncConfigData, SyncState, SYNC_DATA_ALPN,
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

/// Upper bound on one outbound dial + exchange. Mirrors the responder's
/// `INBOUND_TIMEOUT`: a dial that connects then stalls mid-protocol would otherwise
/// hold the activity guard open, keeping the whole endpoint (and its relay link)
/// alive indefinitely and leaking keepalive traffic long after the app went idle.
const DIAL_TIMEOUT: Duration = Duration::from_secs(120);

/// Dials the given peers and reconciles all shared desks with each. The frontend
/// calls this per peer as it signals `ready`. Best-effort and trust-gated: ids not
/// in the paired set are skipped, a peer already being dialed is skipped, and one
/// unreachable peer can't abort the rest.
#[tauri::command]
pub async fn sync_peers(app: AppHandle, peer_ids: Vec<String>) -> Result<(), String> {
    let endpoint = app
        .state::<SyncState>()
        .0
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "sync is not running".to_string())?;
    let local_id = local_device_id(&app)?;
    let cfg = app.state::<SyncConfig>().0.lock().unwrap().clone();
    let inflight = app.state::<InFlightPeers>();
    let activity = app.state::<SyncActivity>();

    for peer_id in &peer_ids {
        if !cfg.peers.iter().any(|p| p == peer_id) {
            continue; // not a paired peer: never dial an id we don't trust
        }
        let Some(_guard) = inflight.try_begin(peer_id) else {
            continue; // already dialing this peer
        };
        let _activity = activity.begin(); // holds the endpoint open for this dial
        // Cap the dial so a peer that connects then stalls mid-protocol can't pin the
        // activity guard (and thus the endpoint) open forever.
        match tokio::time::timeout(
            DIAL_TIMEOUT,
            sync_with_peer(&app, &endpoint, &local_id, peer_id, &cfg),
        )
        .await
        {
            // A peer that's offline or unreachable is expected; don't surface it.
            Ok(Err(e)) => log::warn!("sync with {peer_id} failed: {e}"),
            Err(_) => log::warn!("sync with {peer_id} timed out"),
            Ok(Ok(())) => {}
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
