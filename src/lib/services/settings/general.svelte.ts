import { SettingsGroup } from './base.svelte';
import type { DateFormat } from '$lib/utils/date-format';

export interface GeneralSettings {
	language: 'fr' | 'es' | 'en' | 'de';
	closeToTray: boolean | null;
	autoUpdate: boolean;
	dateFormat: DateFormat;
	/** Whether the local MCP server is enabled (AI assistants can read notes). */
	aiCompatibility: boolean;
}

export class GeneralSettingsService extends SettingsGroup<GeneralSettings> {
	readonly key = 'general';
	state = $state<GeneralSettings>({
		language: 'en',
		closeToTray: null,
		autoUpdate: true,
		dateFormat: 'medium',
		aiCompatibility: false
	});

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

	setAiCompatibility(value: boolean): void {
		this.state.aiCompatibility = value;
		this.persist();
	}

	async setLanguage(lang: string): Promise<void> {
		this.state.language = lang as GeneralSettings['language'];
		await this.save();
	}
}
