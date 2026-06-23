import { settingsService } from '$lib/services/settings/settings.svelte';
import { resolveTheme, THEMES, type Theme } from '$lib/domain/theme';

// Application/app-shell layer: applies the resolved theme to the document. The
// theme value and its persistence live in the appearance settings section; the
// pure light/dark resolution is `domain/theme.resolveTheme`. This service owns the
// two unavoidable browser side effects (toggling the root `dark` class and
// listening to the OS colour-scheme preference) and the cross-window re-apply.
class ThemeService {
	#isDark = $state(false);

	get theme(): Theme {
		return settingsService.appearance.state.theme;
	}

	get isDark(): boolean {
		return this.#isDark;
	}

	applyTheme(): void {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const dark = resolveTheme(this.theme, prefersDark) === 'dark';
		document.documentElement.classList.toggle('dark', dark);
		this.#isDark = dark;
	}

	setTheme(theme: Theme): void {
		settingsService.appearance.setTheme(theme);
		this.applyTheme();
	}

	#mediaListener = () => {
		if (this.theme === THEMES.SYSTEM) this.applyTheme();
	};

	init(): void {
		this.applyTheme();
		window
			.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', this.#mediaListener);
		/* Re-apply when the appearance theme changes from another window (the
		   settings store's cross-window sync updates `appearance.state.theme`). */
		$effect.root(() => {
			$effect(() => {
				this.applyTheme();
			});
		});
	}
}

export const themeService = new ThemeService();
