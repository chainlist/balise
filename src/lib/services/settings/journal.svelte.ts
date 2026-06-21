import { SettingsGroup } from './base.svelte';

export interface JournalSettings {
	collapseByDefault: boolean;
}

export class JournalSettingsService extends SettingsGroup<JournalSettings> {
	readonly key = 'journal';
	state = $state<JournalSettings>({ collapseByDefault: false });

	setCollapseByDefault(value: boolean): void {
		this.state.collapseByDefault = value;
		this.persist();
	}
}
