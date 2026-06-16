import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { runSync, setSyncConfig } from '$lib/utils/sync';
import { tagsService } from '$lib/services/content/tags.svelte';
import { devicesService } from '$lib/services/sync/devices.svelte';
import { settingsService } from '$lib/services/settings/settings.svelte';
import { fsService } from '$lib/services/platform/fs';
import { noteSignals } from '$lib/services/content/note-signals';

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

	/** Registers the result listener and starts mirroring config to the backend. */
	async init(): Promise<void> {
		if (this.#unlisten) return;
		this.#unlisten = await listen<SyncResult>('sync-result', (event) =>
			this.#onResult(event.payload)
		);
		this.#mirrorConfig();
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

	/** Begins periodic sync. Runs one cycle immediately, then every interval. */
	startInterval(): void {
		if (this.#interval) return;
		void this.syncAll();
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

	/** Triggers one backend dial cycle. The backend also guards against overlap. */
	async syncAll(): Promise<void> {
		if (this.syncing) return;
		this.syncing = true;
		try {
			await runSync();
		} catch (e) {
			console.warn('sync failed:', e);
		} finally {
			this.syncing = false;
		}
	}
}

export const deviceSyncService = new DeviceSyncService();
