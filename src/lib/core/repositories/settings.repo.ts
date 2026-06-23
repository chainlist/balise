import { type Store } from '@tauri-apps/plugin-store';
import { loadStore } from './backend/store';

// Data access for settings: a thin wrapper over the shared `settings.json`
// plugin-store file. It owns the single loaded handle and exposes section
// get/set, batch key deletion (for the one-time legacy migration), an explicit
// flush, and a cross-window change subscription. No defaults, no validation, no
// business rules; those are the settings domain. The reactive state lives in the
// settings services.

let store: Store | null = null;

function getStore(): Store {
	if (!store) {
		throw new Error('Settings store not loaded. Call settingsRepo.load() first.');
	}
	return store;
}

export const settingsRepo = {
	/** Load (or reuse) the shared settings store. `defaults` (the section defaults,
	 *  supplied by the caller from the domain) back any absent section; `autoSave`
	 *  debounces writes. */
	async load(defaults: Record<string, unknown>): Promise<void> {
		if (store) return;
		store = await loadStore('settings.json', { autoSave: 100, defaults });
	},

	/** Read one section (or any raw key) as a typed value, or `undefined` if absent. */
	getSection<T>(key: string): Promise<T | undefined> {
		return getStore().get<T>(key);
	},

	/** Write one section. Relies on the store's autoSave unless `save()` follows. */
	async setSection<T>(key: string, value: T): Promise<void> {
		await getStore().set(key, value);
	},

	/** Delete a batch of keys (used once by the legacy flat-key migration). */
	async deleteKeys(keys: readonly string[]): Promise<void> {
		for (const key of keys) {
			await getStore().delete(key);
		}
	},

	/** Flush pending writes immediately, for values that must survive a reload. */
	async save(): Promise<void> {
		await getStore().save();
	},

	/** Subscribe to external writes of a section (cross-window theme sync). */
	onSectionChange<T>(key: string, cb: (value: T | undefined) => void): Promise<() => void> {
		return getStore().onKeyChange<T>(key, cb);
	}
};
