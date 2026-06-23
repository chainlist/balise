import { settingsRepo } from '$lib/core/repositories/settings.repo';

/**
 * Application-layer base for one settings section. Owns its key in the shared
 * settings store and holds the section's reactive `$state`. Subclasses declare
 * the concrete `$state` field (seeded from the settings-domain defaults) plus the
 * section's setters and side effects. Persistence goes through `settingsRepo`;
 * defaults and validation come from the domain. This class holds no rules.
 */
export abstract class SettingsSection<T extends object> {
	/** The store key this section is persisted under. */
	abstract readonly key: string;
	/** Reactive section state. Subclasses provide the `$state` field + defaults. */
	abstract state: T;

	/** Load the persisted section, shallow-merged over the defaults. */
	async load(): Promise<void> {
		const stored = await settingsRepo.getSection<Partial<T>>(this.key);
		if (stored) this.state = { ...this.state, ...stored };
	}

	/** Fire-and-forget persist (relies on the store's autoSave). */
	protected persist(): void {
		void settingsRepo.setSection(this.key, $state.snapshot(this.state));
	}

	/** Persist and flush immediately, for values that must survive a reload. */
	protected async save(): Promise<void> {
		await settingsRepo.setSection(this.key, $state.snapshot(this.state));
		await settingsRepo.save();
	}
}
