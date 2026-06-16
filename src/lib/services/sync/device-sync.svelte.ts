import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { syncPeers, setSyncConfig, startSync } from '$lib/utils/sync';
import { deviceIdFromPublicKey, getDeviceId } from '$lib/utils/device-id';
import { tagsService } from '$lib/services/content/tags.svelte';
import { devicesService } from '$lib/services/sync/devices.svelte';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { syncConnectionService } from '$lib/services/sync/sync-connection.svelte';
import { toasterService, errorMessage } from '$lib/services/app/toaster';
import { fsService } from '$lib/services/platform/fs';
import { noteSignals } from '$lib/services/content/note-signals';
import * as m from '$paraglide/messages.js';

/** `sync-result` event payload: what one peer's protocol run changed locally. */
interface SyncResult {
	deviceId: string;
	createdDesk: boolean;
	changedDesks: string[];
}

/**
 * Frontend side of device sync. The protocol itself runs entirely in the Rust
 * backend (dialer + autonomous accept loop) so note content never crosses the
 * IPC bridge and a large sync can't freeze the UI. This service only: pushes the
 * trust/share config the backend needs, kicks off dial cycles on a timer, and
 * reacts to `sync-result` events to refresh the active desk and desk list.
 */
class DeviceSyncService {
	syncing = $state(false);

	#interval: ReturnType<typeof setInterval> | null = null;
	#unlisten: UnlistenFn | null = null;
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
		const device = devicesService.linked.find((d) => d.id === result.deviceId);
		if (device) devicesService.upsert({ ...device, lastSeen: Date.now() });

		if (result.createdDesk) noteSignals.signalDesksChanged();
		if (result.changedDesks.includes(fsService.currentDesk)) {
			void this.#refreshActiveDesk();
		}
	}

	async #refreshActiveDesk(): Promise<void> {
		await tagsService.load();
		noteSignals.signalNotesSynced();
	}

	/** Begins periodic sync. The first cycle is triggered on WS connect (`hello`),
	 *  so this only sets the recurring timer. */
	startInterval(): void {
		if (this.#interval) return;
		this.#interval = setInterval(() => void this.syncAll(), this.#intervalMs());
	}

	stopInterval(): void {
		if (this.#interval) {
			clearInterval(this.#interval);
			this.#interval = null;
		}
	}

	/** Picks up a changed interval setting without forcing an immediate sync. */
	reschedule(): void {
		if (!this.#interval) return;
		clearInterval(this.#interval);
		this.#interval = setInterval(() => void this.syncAll(), this.#intervalMs());
	}

	#intervalMs(): number {
		return Math.max(1, settingsService.sync.state.intervalMinutes) * 60_000;
	}

	/**
	 * Asks the control plane to wake our online peers. The actual dial happens in
	 * {@link #onPeerReady} as each peer reports its endpoint is up. `notify` surfaces
	 * a toast when a user-initiated sync can't be sent (e.g. the control plane is
	 * unreachable); the periodic call stays silent.
	 */
	async syncAll(notify = false): Promise<void> {
		try {
			const sent = await syncConnectionService.requestSync();
			if (!sent && notify) toasterService.warning(m.settings_sync_start_error());
		} catch (e) {
			if (notify) toasterService.error(m.settings_sync_start_error(), errorMessage(e));
			else console.warn('sync request failed:', e);
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
