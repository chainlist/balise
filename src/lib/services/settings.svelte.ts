import { load, type Store } from '@tauri-apps/plugin-store';
import { trayService } from '$lib/services/tray';
import type { MarkMode } from '$lib/utils/cm';
import type { Theme } from './theme.svelte';
import { setLocale, locales } from '$paraglide/runtime.js';

export const SUPPORTED_LOCALES = locales;

export const MAGIC_TAG_MATCH_TYPES = {
	STARTS_WITH: 'starts_with',
	ENDS_WITH: 'ends_with',
	CONTAINS: 'contains',
	CONTAINS_WORD: 'contains_word'
} as const;

export type MagicTagMatchType = (typeof MAGIC_TAG_MATCH_TYPES)[keyof typeof MAGIC_TAG_MATCH_TYPES];

export interface MagicTag {
	pattern: string;
	matchType: MagicTagMatchType;
	tag: string;
}

export const DEFAULT_MAGIC_TAGS: MagicTag[] = [
	{ pattern: '- [ ]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH, tag: 'todo' },
	{ pattern: '- [x]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH, tag: 'done' }
];

class SettingsService {
	theme = $state<Theme>('system');
	fontSize = $state(16);
	lineHeight = $state(1.75);
	markdownMarks = $state<MarkMode>('cursor');
	customBindings = $state<Record<string, string>>({});
	language = $state<'fr' | 'es' | 'en' | 'de'>('en');
	magicTags = $state<MagicTag[]>(DEFAULT_MAGIC_TAGS);
	closeToTray = $state<boolean | null>(null);

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load('settings.json', { autoSave: 100 });

		const [
			theme,
			fontSize,
			lineHeight,
			markdownMarks,
			customBindings,
			language,
			magicTags,
			closeToTray
		] = await Promise.all([
			this.#store.get<Theme>('theme'),
			this.#store.get<number>('fontSize'),
			this.#store.get<number>('lineHeight'),
			this.#store.get<MarkMode>('markdownMarks'),
			this.#store.get<Record<string, string>>('customBindings'),
			this.#store.get<'fr' | 'es' | 'en' | 'de'>('language'),
			this.#store.get<MagicTag[]>('magicTags'),
			this.#store.get<boolean>('closeToTray')
		]);

		this.theme = theme ?? 'system';
		this.fontSize = fontSize ?? 16;
		this.lineHeight = lineHeight ?? 1.75;
		this.markdownMarks = markdownMarks ?? 'cursor';
		this.customBindings = customBindings ?? {};
		this.language = language ?? 'en';
		this.magicTags = (magicTags ?? DEFAULT_MAGIC_TAGS).map(({ matchType, ...rest }) => ({
			...rest,
			matchType: (matchType as MagicTagMatchType | undefined) ?? MAGIC_TAG_MATCH_TYPES.CONTAINS
		}));
		this.closeToTray = closeToTray ?? null;

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
		await trayService.remove();
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

	setMagicTags(tags: MagicTag[]): void {
		this.magicTags = tags;
		void this.#store?.set('magicTags', tags);
	}

	setCloseToTray(value: boolean): void {
		this.closeToTray = value;
		void this.#store?.set('closeToTray', value);
	}
}

export const settingsService = new SettingsService();
