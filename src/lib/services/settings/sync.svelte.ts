import { SettingsGroup } from './base.svelte';
import { sanitizeDeskName } from '../platform/desk';

export interface SyncSettings {
	enabled: boolean;
	/** How often to sync with linked devices, in minutes. */
	intervalMinutes: number;
	/** Custom pairing server URL; empty falls back to the build-time default. */
	syncUrl: string;
	/** Whether this device shares its app settings (everything except sync
	 *  settings) with paired devices. */
	shareSettings: boolean;
	/** Desk names this device excludes from sync. Empty shares every desk,
	 *  including any added later. Stored sanitized so the sync gate (which only
	 *  knows the sanitized desk name) and the settings UI agree. */
	unsharedDesks: string[];
}

/** Selectable sync cadences, in minutes. */
export const SYNC_INTERVAL_OPTIONS = [1, 5, 15, 30, 60] as const;

export class SyncSettingsService extends SettingsGroup<SyncSettings> {
	readonly key = 'sync';
	state = $state<SyncSettings>({
		enabled: false,
		intervalMinutes: 5,
		syncUrl: '',
		shareSettings: true,
		unsharedDesks: []
	});

	setSyncEnabled(value: boolean): void {
		this.state.enabled = value;
		this.persist();
	}

	setSyncInterval(minutes: number): void {
		this.state.intervalMinutes = minutes;
		this.persist();
	}

	setSyncUrl(url: string): void {
		this.state.syncUrl = url;
		this.persist();
	}

	setShareSettings(value: boolean): void {
		this.state.shareSettings = value;
		this.persist();
	}

	/** Whether `desk` syncs with paired devices. Unknown/empty desks default to shared. */
	isDeskShared(desk: string): boolean {
		if (!desk.trim()) return true;
		return !this.state.unsharedDesks.includes(sanitizeDeskName(desk));
	}

	setDeskShared(desk: string, shared: boolean): void {
		const safe = sanitizeDeskName(desk);
		const without = this.state.unsharedDesks.filter((d) => d !== safe);
		this.state.unsharedDesks = shared ? without : [...without, safe];
		this.persist();
	}

	/** Carries a desk's share choice across a rename. */
	renameSharedDesk(oldDesk: string, newDesk: string): void {
		const oldSafe = sanitizeDeskName(oldDesk);
		if (!this.state.unsharedDesks.includes(oldSafe)) return;
		const newSafe = sanitizeDeskName(newDesk);
		this.state.unsharedDesks = this.state.unsharedDesks.map((d) => (d === oldSafe ? newSafe : d));
		this.persist();
	}

	/** Drops a deleted desk's stale share entry. */
	forgetDesk(desk: string): void {
		const safe = sanitizeDeskName(desk);
		if (!this.state.unsharedDesks.includes(safe)) return;
		this.state.unsharedDesks = this.state.unsharedDesks.filter((d) => d !== safe);
		this.persist();
	}
}
