import { settingsService } from './settings.svelte';

export type Theme = 'light' | 'dark' | 'system';

class ThemeService {
	get theme(): Theme {
		return settingsService.theme;
	}

	#resolve(): 'light' | 'dark' {
		if (settingsService.theme !== 'system') return settingsService.theme;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	applyTheme(): void {
		document.documentElement.classList.toggle('dark', this.#resolve() === 'dark');
	}

	setTheme(theme: Theme): void {
		settingsService.setTheme(theme);
		this.applyTheme();
	}

	init(): void {
		this.applyTheme();
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (settingsService.theme === 'system') this.applyTheme();
		});
	}
}

export const themeService = new ThemeService();
