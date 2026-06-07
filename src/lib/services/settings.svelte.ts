import { load, type Store } from '@tauri-apps/plugin-store';
import type { MarkMode } from '$lib/utils/cm';
import type { Theme } from './theme.svelte';
import { setLocale, locales } from '$paraglide/runtime.js';

export const SUPPORTED_LOCALES = locales;

class SettingsService {
	theme = $state<Theme>('system');
	fontSize = $state(16);
	lineHeight = $state(1.75);
	markdownMarks = $state<MarkMode>('cursor');
	customBindings = $state<Record<string, string>>({});
	language = $state<'fr' | 'es' | 'en' | 'de'>('en');

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load('settings.json', { autoSave: 100 });

		const [theme, fontSize, lineHeight, markdownMarks, customBindings, language] =
			await Promise.all([
				this.#store.get<Theme>('theme'),
				this.#store.get<number>('fontSize'),
				this.#store.get<number>('lineHeight'),
				this.#store.get<MarkMode>('markdownMarks'),
				this.#store.get<Record<string, string>>('customBindings'),
				this.#store.get<'fr' | 'es' | 'en' | 'de'>('language')
			]);

		this.theme = theme ?? 'system';
		this.fontSize = fontSize ?? 16;
		this.lineHeight = lineHeight ?? 1.75;
		this.markdownMarks = markdownMarks ?? 'cursor';
		this.customBindings = customBindings ?? {};
		this.language = language ?? 'en';

		setLocale(this.language);
		this.#applyEditorVars();
	}

	#applyEditorVars(): void {
		document.documentElement.style.setProperty('--editor-font-size', `${this.fontSize}px`);
		document.documentElement.style.setProperty('--editor-line-height', `${this.lineHeight}`);
	}

	setTheme(theme: Theme): void {
		this.theme = theme;
		void this.#store?.set('theme', theme);
	}

	setFontSize(size: number): void {
		this.fontSize = size;
		this.#applyEditorVars();
		void this.#store?.set('fontSize', size);
	}

	setLineHeight(value: number): void {
		this.lineHeight = value;
		this.#applyEditorVars();
		void this.#store?.set('lineHeight', value);
	}

	setMarkdownMarks(value: MarkMode): void {
		this.markdownMarks = value;
		void this.#store?.set('markdownMarks', value);
	}

	async setLanguage(lang: string): Promise<void> {
		this.language = lang;
		if (this.#store) {
			await this.#store.set('language', lang);
			await this.#store.save();
		}
		window.location.reload();
	}

	setBinding(id: string, binding: string): void {
		this.customBindings = { ...this.customBindings, [id]: binding };
		void this.#store?.set('customBindings', this.customBindings);
	}

	resetBinding(id: string): void {
		const next = { ...this.customBindings };
		delete next[id];
		this.customBindings = next;
		void this.#store?.set('customBindings', next);
	}
}

export const settingsService = new SettingsService();
