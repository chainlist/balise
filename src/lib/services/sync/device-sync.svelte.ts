import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { syncPeers, setSyncConfig, startSync } from '$lib/utils/sync';
import { deviceIdFromPublicKey, getDeviceId } from '$lib/utils/device-id';
import { tagsService } from '$lib/core/services/tags.svelte';
import { devicesService } from '$lib/services/sync/devices.svelte';
import { settingsService } from '$lib/core/services/settings/settings.svelte';
import { syncConnectionService } from '$lib/services/sync/sync-connection.svelte';
import { toasterService, errorMessage } from '$lib/core/services/toaster';
import { fsService } from '$lib/core/repositories/backend/fs';
import { eventBus } from '$lib/core/services/events/event-bus';
import * as m from '$paraglide/messages.js';

/** `sync-result` event payload: what one peer's protocol run changed locally. */
interface SyncResult {
	deviceId: string;
	createdDesk: boolean;
	changedDesks: string[];
}

/** Once the throttle would allow a sync, wait for a typing gap this long first,
 *  so we fire between thoughts rather than mid-sentence (a thinking pause is
 *  shorter than this). The throttle window itself is the configurable
 *  `sync.intervalMinutes` setting. */
const SYNC_DEBOUNCE_MS = 15_000;
/** Backoff bounds for retrying a sync that failed to send or to dial. */
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 30_000;
/** Give up active retries after this many tries; a later reconnect or peer wake
 *  then reconciles the still-pending changes. */
const MAX_RETRIES = 5;

/**
 * Frontend side of device sync. The protocol itself runs entirely in the Rust
 * backend (dialer + autonomous accept loop) so note content never crosses the
 * IPC bridge and a large sync can't freeze the UI. This service only: pushes the
 * trust/share config the backend needs, kicks off dial cycles on a timer, and
 * reacts to `sync-result` events to refresh the active desk and desk list.
 */
class DeviceSyncService {
	syncing = $state(false);

	#unlisten: UnlistenFn | null = null;
	/** True while we hold local edits not yet confirmed synced by a `sync-result`.
	 *  Drives the retry loop; cleared in {@link #onResult}. */
	#pending = false;
	/** Throttled + debounced trigger for the next edit-driven sync. */
	#syncTimer: ReturnType<typeof setTimeout> | null = null;
	/** When the last sync completed; the throttle floor is measured from here. */
	#lastSyncAt = 0;
	#retryTimer: ReturnType<typeof setTimeout> | null = null;
	#retryDelay = RETRY_MIN_MS;
	#retries = 0;
	/** Peers with a dial in flight, so overlapping dial triggers for the same peer
	 *  don't dial it twice; also drives the {@link syncing} flag. */
	#dialing = new Set<string>();
	/** This device's Base32 id, cached for the dial-direction tiebreak. */
	#localId: string | null = null;

	/** Registers the result listener and starts mirroring config to the backend. */
	async init(): Promise<void> {
		if (this.#unlisten) return;
		this.#unlisten = await listen<SyncResult>('sync-result', (event) =>
			this.#onResult(event.payload)
		);
		this.#mirrorConfig();
		syncConnectionService.onPeerReady((peerKey) => void this.#onPeerReady(peerKey));
		syncConnectionService.onWake((initiatorKey) => void this.#onWake(initiatorKey));
		eventBus.sync.localChange.on(() => this.#onLocalChange());
	}

	/**
	 * Keeps the backend's config in sync with the stores. The root effect re-pushes
	 * whenever the paired devices, unshared desks, or magic tags change, so the
	 * accept loop (which runs without any frontend call) always has fresh state.
	 */
	#mirrorConfig(): void {
		$effect.root(() => {
			$effect(() => {
				const peers = devicesService.linked.map((d) => d.id);
				const unshared = [...settingsService.sync.state.unsharedDesks];
				const magicTags = $state.snapshot(settingsService.magicTags.state.tags);
				void setSyncConfig({ peers, unshared, magicTags });
			});
		});
	}

	/** Refreshes the active desk / desk list from a backend sync result. */
	#onResult(result: SyncResult): void {
		// A reconcile completed: our pending edits have gone out, and the throttle
		// clock restarts from now.
		this.#pending = false;
		this.#lastSyncAt = Date.now();
		this.#clearRetry();

		const device = devicesService.linked.find((d) => d.id === result.deviceId);
		if (device) devicesService.upsert({ ...device, lastSeen: Date.now() });

		if (result.createdDesk) eventBus.desks.created.emit();
		if (result.changedDesks.includes(fsService.currentDesk)) {
			void this.#refreshActiveDesk();
		}
	}

	async #refreshActiveDesk(): Promise<void> {
		await tagsService.load();
		eventBus.sync.synced.emit();
	}

	/**
	 * A local note write happened. Mark us dirty and (re)arm the trigger: it fires
	 * at the first typing gap of {@link SYNC_DEBOUNCE_MS} once at least the throttle
	 * window (`sync.intervalMinutes`) has passed since the last sync. The `max` makes
	 * one timer do both jobs - throttle floor while the window is closed, plain
	 * debounce once it has opened. No-op when sync can't do anything (off / no peers).
	 */
	#onLocalChange(): void {
		if (!settingsService.sync.state.enabled || devicesService.linked.length === 0) return;
		this.#pending = true;
		if (this.#syncTimer) clearTimeout(this.#syncTimer);
		const throttleMs = Math.max(1, settingsService.sync.state.intervalMinutes) * 60_000;
		const sinceLast = Date.now() - this.#lastSyncAt;
		const wait = Math.max(SYNC_DEBOUNCE_MS, throttleMs - sinceLast);
		this.#syncTimer = setTimeout(() => {
			this.#syncTimer = null;
			void this.#attemptSync();
		}, wait);
	}

	/** Fires one sync; a failure to even send arms the retry backoff. A failed dial
	 *  re-arms it from {@link #dial}; a `sync-result` clears it in {@link #onResult}. */
	async #attemptSync(): Promise<void> {
		if (!(await this.syncAll())) this.#scheduleRetry();
	}

	/** Retries a failed sync with capped backoff while we're still dirty, then gives
	 *  up so an absent peer isn't poked forever; a reconnect/wake reconciles us. */
	#scheduleRetry(): void {
		if (!this.#pending || this.#retryTimer || this.#retries >= MAX_RETRIES) return;
		this.#retries++;
		const delay = this.#retryDelay;
		this.#retryDelay = Math.min(this.#retryDelay * 2, RETRY_MAX_MS);
		this.#retryTimer = setTimeout(() => {
			this.#retryTimer = null;
			void this.#attemptSync();
		}, delay);
	}

	#clearRetry(): void {
		if (this.#retryTimer) {
			clearTimeout(this.#retryTimer);
			this.#retryTimer = null;
		}
		this.#retryDelay = RETRY_MIN_MS;
		this.#retries = 0;
	}

	/**
	 * Asks the control plane to wake our online peers. The actual dial happens in
	 * {@link #onPeerReady} as each peer reports its endpoint is up. `notify` surfaces
	 * a toast when a user-initiated sync can't be sent (e.g. the control plane is
	 * unreachable); the edit-driven and retry calls stay silent. Returns whether the
	 * request was sent, so the caller can arm a retry.
	 */
	async syncAll(notify = false): Promise<boolean> {
		try {
			const sent = await syncConnectionService.requestSync();
			if (!sent && notify) toasterService.warning(m.settings_sync_start_error());
			return sent;
		} catch (e) {
			if (notify) toasterService.error(m.settings_sync_start_error(), errorMessage(e));
			else console.warn('sync request failed:', e);
			return false;
		}
	}

	/**
	 * A peer reports its endpoint is up (`peer-ready`). Only the lower-id side of a
	 * pair is ever asked to dial (the higher-id side sends `ready` instead), so by
	 * construction we're the dialer here. Dial it now, no fixed wait.
	 */
	async #onPeerReady(peerKey: string): Promise<void> {
		await this.#dial(await deviceIdFromPublicKey(peerKey));
	}

	/**
	 * A paired peer woke us to sync. Bring up our endpoint, then break the tie so a
	 * pair never dials both ways: the lower-id device dials, the higher-id device
	 * sends `ready` and waits to be dialed. The id order is a stable total order
	 * both ends compute identically, so exactly one connection is made per pair.
	 */
	async #onWake(initiatorKey: string): Promise<void> {
		try {
			await startSync();
			const [localId, initiatorId] = await Promise.all([
				this.#deviceId(),
				deviceIdFromPublicKey(initiatorKey)
			]);
			if (localId < initiatorId) await this.#dial(initiatorId);
			else syncConnectionService.sendReady(initiatorKey);
		} catch (e) {
			console.warn('sync wake failed:', e);
		}
	}

	/**
	 * Dials one peer and reconciles every shared desk over the one connection.
	 * Dedupes concurrent dials of the same peer and drives the {@link syncing} flag.
	 */
	async #dial(id: string): Promise<void> {
		if (this.#dialing.has(id)) return;
		this.#dialing.add(id);
		this.syncing = true;
		try {
			await syncPeers([id]);
		} catch (e) {
			console.warn('sync dial failed:', e);
			this.#scheduleRetry();
		} finally {
			this.#dialing.delete(id);
			if (this.#dialing.size === 0) this.syncing = false;
		}
	}

	async #deviceId(): Promise<string> {
		if (!this.#localId) this.#localId = await getDeviceId();
		return this.#localId;
	}
}

export const deviceSyncService = new DeviceSyncService();
