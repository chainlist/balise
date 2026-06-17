//! The iroh networking layer: managed sync state, endpoint lifecycle, device-id
//! helpers, and the autonomous accept loop (the responder side).

use std::collections::HashSet;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

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

/// Tracks which peers currently have a dial in flight. Dials are now triggered
/// per peer (one `peer-ready` signal each), so the guard is per peer rather than
/// a single global flag: a slow dial to one peer must not drop a concurrent dial
/// to another. A second dial to a peer already in flight is skipped.
#[derive(Default)]
pub struct InFlightPeers(Mutex<HashSet<String>>);

impl InFlightPeers {
    /// Marks a peer's dial as in progress, returning a guard that clears it when
    /// dropped (on every exit path, including a panic). `None` if that peer is
    /// already being dialed.
    pub(crate) fn try_begin<'a>(&'a self, peer: &str) -> Option<InFlightGuard<'a>> {
        let mut set = self.0.lock().unwrap();
        if !set.insert(peer.to_string()) {
            return None;
        }
        Some(InFlightGuard {
            set: &self.0,
            peer: peer.to_string(),
        })
    }
}

/// Clears a peer's [`InFlightPeers`] entry on drop.
pub(crate) struct InFlightGuard<'a> {
    set: &'a Mutex<HashSet<String>>,
    peer: String,
}

impl Drop for InFlightGuard<'_> {
    fn drop(&mut self) {
        self.set.lock().unwrap().remove(&self.peer);
    }
}

/// Tracks sync exchanges in flight (dialer and responder) and the time of the last
/// activity, so the idle supervisor can tear the endpoint down once sync goes quiet.
#[derive(Clone)]
pub struct SyncActivity(Arc<ActivityInner>);

struct ActivityInner {
    in_flight: AtomicUsize,
    last_active: Mutex<Instant>,
}

impl Default for SyncActivity {
    fn default() -> Self {
        Self(Arc::new(ActivityInner {
            in_flight: AtomicUsize::new(0),
            last_active: Mutex::new(Instant::now()),
        }))
    }
}

impl SyncActivity {
    /// Refreshes the activity clock, e.g. when a wake (re)starts the endpoint.
    fn touch(&self) {
        *self.0.last_active.lock().unwrap() = Instant::now();
    }

    fn in_flight(&self) -> usize {
        self.0.in_flight.load(Ordering::SeqCst)
    }

    fn idle_for(&self) -> Duration {
        self.0.last_active.lock().unwrap().elapsed()
    }

    /// Marks one exchange as in progress, returning a guard that decrements the
    /// count and refreshes the clock when dropped (on every exit path, incl. panic).
    pub(crate) fn begin(&self) -> ActivityGuard {
        self.0.in_flight.fetch_add(1, Ordering::SeqCst);
        self.touch();
        ActivityGuard(self.0.clone())
    }
}

/// Decrements the in-flight count and refreshes the idle clock on drop.
pub(crate) struct ActivityGuard(Arc<ActivityInner>);

impl Drop for ActivityGuard {
    fn drop(&mut self) {
        self.0.in_flight.fetch_sub(1, Ordering::SeqCst);
        *self.0.last_active.lock().unwrap() = Instant::now();
    }
}

/// Starts the iroh networking layer using this device's persisted Ed25519 seed
/// as its node identity, then spawns the loop that accepts data-sync streams.
/// No-op if already running.
pub(crate) async fn start(app: &AppHandle) -> Result<(), String> {
    let activity = app.state::<SyncActivity>().inner().clone();
    if app.state::<SyncState>().0.lock().unwrap().is_some() {
        activity.touch(); // a wake while already up extends the idle grace
        return Ok(());
    }

    let endpoint = bind(app).await?;
    log::info!("iroh endpoint started: {}", endpoint.id());
    spawn_accept_loop(app.clone(), endpoint.clone());
    activity.touch();
    *app.state::<SyncState>().0.lock().unwrap() = Some(endpoint);
    spawn_idle_supervisor(app.clone(), activity);
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

/// How long the endpoint may sit with no exchange in flight before it is torn down,
/// so iroh's QUIC socket, relay link and discovery only stay up around real sync
/// activity. Must comfortably exceed the wake->ready->dial round trip (a few network
/// hops) so the endpoint an initiator just brought up isn't closed out from under
/// the dial it's waiting to make once a peer signals `ready`.
const IDLE_TIMEOUT: Duration = Duration::from_secs(30);
/// How often the idle supervisor re-checks for inactivity.
const IDLE_CHECK_INTERVAL: Duration = Duration::from_secs(5);

/// Watches sync activity and closes the endpoint once it has been idle for
/// [`IDLE_TIMEOUT`]. Spawned by [`start`]; exits when it closes the endpoint or when
/// the endpoint was already stopped externally (e.g. sync disabled), so a later
/// [`start`] owns the only live supervisor.
fn spawn_idle_supervisor(app: AppHandle, activity: SyncActivity) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(IDLE_CHECK_INTERVAL).await;

            if app.state::<SyncState>().0.lock().unwrap().is_none() {
                break; // stopped externally; nothing to supervise
            }
            if activity.in_flight() > 0 || activity.idle_for() < IDLE_TIMEOUT {
                continue;
            }

            // Idle long enough: take the endpoint under the lock so a dial starting
            // concurrently either keeps it (we observe in_flight > 0 and bail) or
            // finds it gone and re-binds on its next cycle.
            let endpoint = {
                let state = app.state::<SyncState>();
                let mut guard = state.0.lock().unwrap();
                if activity.in_flight() > 0 {
                    None
                } else {
                    guard.take()
                }
            };
            let Some(endpoint) = endpoint else { continue };
            endpoint.close().await;
            log::info!("iroh endpoint idle-closed after sync");
            break;
        }
    });
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
                let _activity = app.state::<SyncActivity>().begin(); // holds the endpoint open while this runs
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
