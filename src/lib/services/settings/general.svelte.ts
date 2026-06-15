import { SettingsGroup } from './base.svelte';

export interface GeneralSettings {
	language: 'fr' | 'es' | 'en' | 'de';
	closeToTray: boolean | null;
	autoUpdate: boolean;
}

export class GeneralSettingsService extends SettingsGroup<GeneralSettings> {
	readonly key = 'general';
	state = $state<GeneralSettings>({ language: 'en', closeToTray: null, autoUpdate: true });

	setCloseToTray(value: boolean): void {
		this.state.closeToTray = value;
		this.persist();
	}

	setAutoUpdate(value: boolean): void {
		this.state.autoUpdate = value;
		this.persist();
	}

	async setLanguage(lang: string): Promise<void> {
		this.state.language = lang as GeneralSettings['language'];
		await this.save();
	}
}
