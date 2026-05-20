export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'fil-theme';

class ThemeService {
	theme = $state<Theme>('system');

	#resolve(): 'light' | 'dark' {
		if (this.theme !== 'system') return this.theme;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	applyTheme(): void {
		document.documentElement.classList.toggle('dark', this.#resolve() === 'dark');
	}

	setTheme(theme: Theme): void {
		this.theme = theme;
		localStorage.setItem(STORAGE_KEY, theme);
		this.applyTheme();
	}

	init(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored === 'light' || stored === 'dark' || stored === 'system') {
				this.theme = stored;
			}
		} catch {
			// ignore
		}
		this.applyTheme();

		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			if (this.theme === 'system') this.applyTheme();
		});
	}
}

export const themeService = new ThemeService();
