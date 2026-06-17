import { settingsService } from '../settings/settings.svelte';

export type Theme = 'light' | 'dark' | 'system';

class ThemeService {
	#isDark = $state(false);

	get theme(): Theme {
		return settingsService.appearance.state.theme;
	}

	get isDark(): boolean {
		return this.#isDark;
	}

	#resolve(): 'light' | 'dark' {
		if (settingsService.appearance.state.theme !== 'system')
			return settingsService.appearance.state.theme;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	applyTheme(): void {
		const dark = this.#resolve() === 'dark';
		document.documentElement.classList.toggle('dark', dark);
		this.#isDark = dark;
	}

	setTheme(theme: Theme): void {
		settingsService.appearance.setTheme(theme);
		this.applyTheme();
	}

	#mediaListener = () => {
		if (settingsService.appearance.state.theme === 'system') this.applyTheme();
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
