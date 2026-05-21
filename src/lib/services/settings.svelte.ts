import { load, type Store } from '@tauri-apps/plugin-store';
import type { MarkMode } from '$lib/utils/cm';
import type { Theme } from './theme.svelte';

class SettingsService {
	theme = $state<Theme>('system');
	fontSize = $state(16);
	markdownMarks = $state<MarkMode>('cursor');
	customBindings = $state<Record<string, string>>({});

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load('settings.json', { autoSave: 100 });

		const [theme, fontSize, markdownMarks, customBindings] = await Promise.all([
			this.#store.get<Theme>('theme'),
			this.#store.get<number>('fontSize'),
			this.#store.get<MarkMode>('markdownMarks'),
			this.#store.get<Record<string, string>>('customBindings')
		]);

		this.theme = theme ?? 'system';
		this.fontSize = fontSize ?? 16;
		this.markdownMarks = markdownMarks ?? 'cursor';
		this.customBindings = customBindings ?? {};
		this.#applyFontSize();
	}

	#applyFontSize(): void {
		document.documentElement.style.setProperty('--editor-font-size', `${this.fontSize}px`);
	}

	setTheme(theme: Theme): void {
		this.theme = theme;
		this.#store?.set('theme', theme);
	}

	setFontSize(size: number): void {
		this.fontSize = size;
		this.#applyFontSize();
		this.#store?.set('fontSize', size);
	}

	setMarkdownMarks(value: MarkMode): void {
		this.markdownMarks = value;
		this.#store?.set('markdownMarks', value);
	}

	setBinding(id: string, binding: string): void {
		this.customBindings = { ...this.customBindings, [id]: binding };
		this.#store?.set('customBindings', this.customBindings);
	}

	resetBinding(id: string): void {
		const next = { ...this.customBindings };
		delete next[id];
		this.customBindings = next;
		this.#store?.set('customBindings', next);
	}
}

export const settingsService = new SettingsService();
