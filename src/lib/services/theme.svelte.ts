import { settingsService } from './settings.svelte';

export type Theme = 'light' | 'dark' | 'system';

class ThemeService {
	#isDark = $state(false);

	get theme(): Theme {
		return settingsService.theme;
	}

	get isDark(): boolean {
		return this.#isDark;
	}

	#resolve(): 'light' | 'dark' {
		if (settingsService.theme !== 'system') return settingsService.theme;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	applyTheme(): void {
		const dark = this.#resolve() === 'dark';
		document.documentElement.classList.toggle('dark', dark);
		this.#isDark = dark;
	}

	setTheme(theme: Theme): void {
		settingsService.setTheme(theme);
		this.applyTheme();
	}

	#mediaListener = () => {
		if (settingsService.theme === 'system') this.applyTheme();
	};

	init(): void {
		this.applyTheme();
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.#mediaListener);
	}


}

export const themeService = new ThemeService();
