import { SettingsSection } from './base.svelte';
import { DEFAULT_JOURNAL_SETTINGS, type JournalSettings } from '$lib/core/domain/settings';

export class JournalSettingsSection extends SettingsSection<JournalSettings> {
	readonly key = 'journal';
	state = $state<JournalSettings>({ ...DEFAULT_JOURNAL_SETTINGS });

	setCollapseByDefault(value: boolean): void {
		this.state.collapseByDefault = value;
		this.persist();
	}
}
