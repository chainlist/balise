import { load, type Store } from '@tauri-apps/plugin-store';

class ModalState {
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

	async init(): Promise<void> {
		this.#store = await load('ui-state.json', { autoSave: 100, defaults: {} });
		this.lastSeenVersion = (await this.#store.get<string>('lastSeenVersion')) ?? '';
	}

	setLastSeenVersion(version: string): void {
		this.lastSeenVersion = version;
		void this.#store?.set('lastSeenVersion', version);
	}
}

export const modalState = new ModalState();
