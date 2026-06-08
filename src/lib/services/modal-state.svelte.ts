import type { Store } from '@tauri-apps/plugin-store';

export class ModalState {
	isSettingsOpen = $state(false);
	isCommandPaletteOpen = $state(false);
	isCapturingShortcut = $state(false);
	isWizardOpen = $state(false);
	isZenModeActive = $state(false);
	isNewsOpen = $state(false);
	newsContent = $state('');
	newsVersion = $state('');
	lastSeenVersion = $state('');

	#store: Store | null = null;

	init(store: Store, lastSeenVersion: string): void {
		this.#store = store;
		this.lastSeenVersion = lastSeenVersion;
	}

	setLastSeenVersion(version: string): void {
		this.lastSeenVersion = version;
		void this.#store?.set('lastSeenVersion', version);
	}
}
