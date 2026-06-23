import { SettingsSection } from './base.svelte';
import { DEFAULT_SYNC_SETTINGS, type SyncSettings } from '$lib/domain/settings';
import { sanitizeDeskName } from '$lib/domain/desk';

export class SyncSettingsSection extends SettingsSection<SyncSettings> {
	readonly key = 'sync';
	state = $state<SyncSettings>({ ...DEFAULT_SYNC_SETTINGS });

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
