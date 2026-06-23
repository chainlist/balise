import { SettingsSection } from './base.svelte';
import {
	DEFAULT_GENERAL_SETTINGS,
	normalizeLanguage,
	type GeneralSettings,
	type DateFormat
} from '$lib/core/domain/settings';

export class GeneralSettingsSection extends SettingsSection<GeneralSettings> {
	readonly key = 'general';
	state = $state<GeneralSettings>({ ...DEFAULT_GENERAL_SETTINGS });

	setCloseToTray(value: boolean): void {
		this.state.closeToTray = value;
		this.persist();
	}

	setDateFormat(value: DateFormat): void {
		this.state.dateFormat = value;
		this.persist();
	}

	setAutoUpdate(value: boolean): void {
		this.state.autoUpdate = value;
		this.persist();
	}

	async setLanguage(lang: string): Promise<void> {
		this.state.language = normalizeLanguage(lang);
		await this.save();
	}
}
