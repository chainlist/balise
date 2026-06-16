//! The iroh networking layer: managed sync state, endpoint lifecycle, device-id
//! helpers, and the autonomous accept loop (the responder side).

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use data_encoding::BASE32_NOPAD;
use iroh::endpoint::presets;
use iroh::{Endpoint, PublicKey, SecretKey};
use tauri::{AppHandle, Manager};
use tokio::sync::Semaphore;

use crate::commands::device::load_or_create_signing_key;

use super::extract::MagicTag;
use super::protocol::{emit_result, run_protocol};

/// ALPN identifying the data-sync stream (manifest + note bodies) over QUIC.
/// Pairing no longer runs over iroh; it goes through the sync server.
pub(crate) const SYNC_DATA_ALPN: &[u8] = b"balise/sync-data/0";

/// Holds the running iroh endpoint while sync is enabled, `None` when it is off.
#[derive(Default)]
pub struct SyncState(pub(crate) Mutex<Option<Endpoint>>);

/// Snapshot of everything the protocol needs that lives in the frontend's stores.
/// The frontend pushes it via [`super::commands::set_sync_config`] on launch and
/// whenever it changes, so the autonomous accept loop and the dialer both work
/// without calling back into JS mid-protocol.
#[derive(Default)]
pub struct SyncConfig(pub(crate) Mutex<SyncConfigData>);

#[derive(Default, Clone)]
pub(crate) struct SyncConfigData {
    /// Base32 device ids of paired peers (the trust set for both dialing and accepting).
    pub(crate) peers: Vec<String>,
    /// Sanitized desk names this device refuses to sync.
    pub(crate) unshared: Vec<String>,
    /// Magic-tag rules, applied when deriving tags for synced-in notes.
    pub(crate) magic_tags: Vec<MagicTag>,
}

/// Guards against overlapping dial cycles (a slow peer outliving the interval).
#[derive(Default)]
pub struct SyncRunning(AtomicBool);

impl SyncRunning {
    /// Marks a dial cycle as in progress, returning a guard that clears the flag
    /// when dropped (so it is released on every exit path, including a panic).
    /// `None` if a cycle is already running.
    pub(crate) fn try_begin(&self) -> Option<SyncRunningGuard<'_>> {
        if self.0.swap(true, Ordering::SeqCst) {
            None
        } else {
            Some(SyncRunningGuard(&self.0))
        }
    }
}

/// Clears the [`SyncRunning`] flag on drop.
pub(crate) struct SyncRunningGuard<'a>(&'a AtomicBool);

impl Drop for SyncRunningGuard<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

/// Starts the iroh networking layer using this device's persisted Ed25519 seed
/// as its node identity, then spawns the loop that accepts data-sync streams.
/// No-op if already running.
pub(crate) async fn start(app: &AppHandle) -> Result<(), String> {
    if app.state::<SyncState>().0.lock().unwrap().is_some() {
        return Ok(());
    }

    let endpoint = bind(app).await?;
    log::info!("iroh endpoint started: {}", endpoint.id());
    spawn_accept_loop(app.clone(), endpoint.clone());
    *app.state::<SyncState>().0.lock().unwrap() = Some(endpoint);
    Ok(())
}

/// Stops the iroh networking layer, shutting down the QUIC socket, relay link
/// and discovery. Closing the endpoint ends the accept loop. No-op if not running.
pub(crate) async fn stop(app: &AppHandle) {
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
        .alpns(vec![SYNC_DATA_ALPN.to_vec()])
        .bind()
        .await
        .map_err(|e| e.to_string())
}

/// This device's stable id: Base32 of its Ed25519 public key (same value as the
/// `device_id` command), used for the LWW tiebreak and pairing checks.
pub(crate) fn local_device_id(app: &AppHandle) -> Result<String, String> {
    let key = load_or_create_signing_key(app)?;
    Ok(BASE32_NOPAD.encode(key.verifying_key().as_bytes()))
}

/// Decodes a Base32 device id into the Ed25519 public key used as a node id.
pub(crate) fn parse_device_id(device_id: &str) -> Result<PublicKey, String> {
    let bytes = BASE32_NOPAD
        .decode(device_id.as_bytes())
        .map_err(|_| "invalid device id".to_string())?;
    let key: [u8; 32] = bytes
        .as_slice()
        .try_into()
        .map_err(|_| "invalid device id".to_string())?;
    PublicKey::from_bytes(&key).map_err(|_| "invalid device id".to_string())
}

/// Most inbound sync exchanges handled at once. Connections past this are refused
/// before the QUIC handshake, so a connection flood costs us almost nothing. A
/// legit peer that's briefly over the cap just retries on its next dial cycle.
const MAX_CONCURRENT_INBOUND: usize = 8;

/// Upper bound on one inbound exchange. Caps a peer that completes the handshake
/// but then stalls mid-protocol (slow-loris); its slot frees when this fires.
const INBOUND_TIMEOUT: Duration = Duration::from_secs(120);

/// Accepts incoming data-sync connections until the endpoint is closed, handling
/// each on its own task so a slow peer can't block others.
///
/// DoS hardening: iroh can't reveal the dialer's device id until the handshake
/// completes, so the paired-peer check in [`handle_incoming`] is necessarily
/// post-handshake. To stop an untrusted flood from forcing unbounded handshakes
/// and tasks, a semaphore caps concurrent handlers and any connection over the cap
/// is `refuse`d *before* the handshake runs. Each handler is also time-bounded so
/// a peer that connects then stalls can't pin a slot indefinitely.
fn spawn_accept_loop(app: AppHandle, endpoint: Endpoint) {
    let limit = Arc::new(Semaphore::new(MAX_CONCURRENT_INBOUND));
    tauri::async_runtime::spawn(async move {
        while let Some(incoming) = endpoint.accept().await {
            let Ok(permit) = limit.clone().try_acquire_owned() else {
                incoming.refuse(); // over capacity: reject before the handshake
                continue;
            };
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                let _permit = permit; // released on task exit, freeing the slot
                match tokio::time::timeout(INBOUND_TIMEOUT, handle_incoming(&app, incoming)).await {
                    Ok(Err(e)) => log::warn!("incoming sync failed: {e}"),
                    Err(_) => log::warn!("incoming sync timed out"),
                    Ok(Ok(())) => {}
                }
            });
        }
    });
}

/// Responder side: validate the peer is paired, then drive the same protocol the
/// dialer runs. Note content never reaches the frontend; only the outcome does.
async fn handle_incoming(app: &AppHandle, incoming: iroh::endpoint::Incoming) -> Result<(), String> {
    let connection = incoming.await.map_err(|e| e.to_string())?;
    if connection.alpn() != SYNC_DATA_ALPN {
        return Err("unknown protocol".to_string());
    }
    let remote_id = BASE32_NOPAD.encode(connection.remote_id().as_bytes());

    let cfg = app.state::<SyncConfig>().0.lock().unwrap().clone();
    if !cfg.peers.iter().any(|p| p == &remote_id) {
        return Ok(()); // not a paired peer: drop the connection
    }
    let local_id = local_device_id(app)?;

    let (mut send, mut recv) = connection.accept_bi().await.map_err(|e| e.to_string())?;
    let outcome = run_protocol(
        app,
        &local_id,
        &remote_id,
        &mut send,
        &mut recv,
        &cfg.unshared,
        &cfg.magic_tags,
    )
    .await?;
    emit_result(app, &remote_id, outcome);
    Ok(())
}
