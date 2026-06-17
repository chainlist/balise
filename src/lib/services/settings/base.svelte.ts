import type { Store } from '@tauri-apps/plugin-store';

/**
 * Base for one settings section. Owns a single key in the shared store, holds
 * the section's reactive state, and provides load/persist helpers. Subclasses
 * declare the concrete `$state` field (with its defaults) plus the section's
 * setters and side effects (CSS vars, locale, ...).
 */
export abstract class SettingsGroup<T extends object> {
	/** The store key this section is persisted under. */
	abstract readonly key: string;
	/** Reactive section state. Subclasses provide the `$state` field + defaults. */
	abstract state: T;

	constructor(protected readonly store: Store) {}

	/** Loads the persisted section, shallow-merged over the defaults. */
	async load(): Promise<void> {
		const stored = await this.store.get<Partial<T>>(this.key);
		if (stored) this.state = { ...this.state, ...stored };
	}

	/** Fire-and-forget persist (relies on the store's autoSave). */
	protected persist(): void {
		void this.store.set(this.key, $state.snapshot(this.state));
	}

	/** Persist and flush immediately, for values that must survive a reload. */
	protected async save(): Promise<void> {
		await this.store.set(this.key, $state.snapshot(this.state));
		await this.store.save();
	}
}
