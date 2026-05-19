export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'fil-theme';

function loadTheme(): Theme {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	} catch {
		// ignore
	}
	return 'system';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
	if (theme !== 'system') return theme;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const themeState = $state({ theme: 'system' as Theme });

export function applyTheme(): void {
	const resolved = resolveTheme(themeState.theme);
	document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function setTheme(theme: Theme): void {
	themeState.theme = theme;
	localStorage.setItem(STORAGE_KEY, theme);
	applyTheme();
}

export function initTheme(): void {
	themeState.theme = loadTheme();
	applyTheme();

	// Keep system theme in sync with OS preference
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (themeState.theme === 'system') applyTheme();
	});
}
