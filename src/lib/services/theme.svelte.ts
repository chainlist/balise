import { settingsService } from './settings.svelte';

export type Theme = 'light' | 'dark' | 'system';

class ThemeService {
	#isDark = $state(false);

	get theme(): Theme {
		return settingsService.appearance.theme;
	}

	get isDark(): boolean {
		return this.#isDark;
	}

	#resolve(): 'light' | 'dark' {
		if (settingsService.appearance.theme !== 'system') return settingsService.appearance.theme;
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
		if (settingsService.appearance.theme === 'system') this.applyTheme();
	};

	init(): void {
		this.applyTheme();
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.#mediaListener);
		/* Re-apply when settingsService.appearance.theme changes from another window (store onKeyChange) */
		$effect.root(() => {
			$effect(() => {
				this.applyTheme();
			});
		});
	}


}

export const themeService = new ThemeService();
