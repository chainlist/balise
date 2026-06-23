import { type Store } from '@tauri-apps/plugin-store';

// Application layer: transient app-shell modal/overlay flags plus the persisted
// "last seen version" used by the news check. Instantiated and `init`-ed by
// `ui-state`, which passes its `ui-state.json` store so `lastSeenVersion` shares
// one file with the rest of the UI selection state.
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
