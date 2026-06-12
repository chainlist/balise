import { load, type Store } from '@tauri-apps/plugin-store';
import type { MarkMode } from '$lib/utils/cm';
import type { Theme } from './theme.svelte';
import { setLocale, locales } from '$paraglide/runtime.js';
import { primaryColorVars, PRIMARY_COLOR_VARS } from '$lib/utils/primary-color';

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

/* Order matches the mesh gradients: top-left, top-right, bottom-right, bottom-left */
export type MeshColors = [string, string, string, string];
/* Per-corner bubble scale factors, same order as MeshColors */
export type MeshSizes = [number, number, number, number];

export const MESH_MODES = {
	CORNERS: 'corners',
	UNIFIED: 'unified'
} as const;

export type MeshMode = (typeof MESH_MODES)[keyof typeof MESH_MODES];

export const DEFAULT_MESH_COLORS: MeshColors = ['#7c6cde', '#7c6cde', '#7c6cde', '#7c6cde'];
export const DEFAULT_MESH_SIZES: MeshSizes = [1, 1.9, 1.7, 1];
export const DEFAULT_MESH_UNIFIED_COLOR = '#7c6cde';

const MESH_CSS_VARS = ['--mesh-tl', '--mesh-tr', '--mesh-br', '--mesh-bl'] as const;
const MESH_SIZE_CSS_VARS = [
	'--mesh-tl-size',
	'--mesh-tr-size',
	'--mesh-br-size',
	'--mesh-bl-size'
] as const;

class SettingsService {
	theme = $state<Theme>('system');
	fontSize = $state(16);
	lineHeight = $state(1.75);
	markdownMarks = $state<MarkMode>('cursor');
	customBindings = $state<Record<string, string>>({});
	language = $state<'fr' | 'es' | 'en' | 'de'>('en');
	magicTags = $state<MagicTag[]>(DEFAULT_MAGIC_TAGS);
	closeToTray = $state<boolean | null>(null);
	meshColors = $state<MeshColors>([...DEFAULT_MESH_COLORS]);
	meshSizes = $state<MeshSizes>([...DEFAULT_MESH_SIZES]);
	meshMode = $state<MeshMode>(MESH_MODES.CORNERS);
	meshUnifiedColor = $state(DEFAULT_MESH_UNIFIED_COLOR);
	meshEnabled = $state(true);
	primaryColor = $state<string | null>(null);

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
			closeToTray,
			meshColors,
			meshSizes,
			meshMode,
			meshUnifiedColor,
			meshEnabled,
			primaryColor
		] = await Promise.all([
			this.#store.get<Theme>('theme'),
			this.#store.get<number>('fontSize'),
			this.#store.get<number>('lineHeight'),
			this.#store.get<MarkMode>('markdownMarks'),
			this.#store.get<Record<string, string>>('customBindings'),
			this.#store.get<'fr' | 'es' | 'en' | 'de'>('language'),
			this.#store.get<MagicTag[]>('magicTags'),
			this.#store.get<boolean>('closeToTray'),
			this.#store.get<MeshColors>('meshColors'),
			this.#store.get<MeshSizes>('meshSizes'),
			this.#store.get<MeshMode>('meshMode'),
			this.#store.get<string>('meshUnifiedColor'),
			this.#store.get<boolean>('meshEnabled'),
			this.#store.get<string>('primaryColor')
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
		this.meshColors = meshColors ?? [...DEFAULT_MESH_COLORS];
		this.meshSizes = meshSizes ?? [...DEFAULT_MESH_SIZES];
		this.meshMode = meshMode ?? MESH_MODES.CORNERS;
		this.meshUnifiedColor = meshUnifiedColor ?? DEFAULT_MESH_UNIFIED_COLOR;
		this.meshEnabled = meshEnabled ?? true;
		this.primaryColor = primaryColor ?? null;

		setLocale(this.language);
		this.#applyEditorVars();
		this.#applyMeshVars();
		this.#applyPrimaryVars();

		/* Keep theme in sync across windows (main <-> quick add) */
		void this.#store.onKeyChange<Theme>('theme', (theme) => {
			this.theme = theme ?? 'system';
		});
	}

	#applyEditorVars(): void {
		document.documentElement.style.setProperty('--editor-font-size', `${this.fontSize}px`);
		document.documentElement.style.setProperty('--editor-line-height', `${this.lineHeight}`);
	}

	#applyMeshVars(): void {
		const style = document.documentElement.style;
		const cornersVisible = this.meshEnabled && this.meshMode === MESH_MODES.CORNERS;
		MESH_CSS_VARS.forEach((cssVar, i) => {
			style.setProperty(cssVar, cornersVisible ? this.meshColors[i] : 'transparent');
		});
		MESH_SIZE_CSS_VARS.forEach((cssVar, i) => {
			style.setProperty(cssVar, `${this.meshSizes[i]}`);
		});
		style.setProperty(
			'--mesh-unified',
			this.meshEnabled && this.meshMode === MESH_MODES.UNIFIED
				? this.meshUnifiedColor
				: 'transparent'
		);
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

	setMeshColor(corner: number, color: string): void {
		this.meshColors[corner] = color;
		this.#applyMeshVars();
		void this.#store?.set('meshColors', $state.snapshot(this.meshColors));
	}

	setMeshSize(corner: number, size: number): void {
		this.meshSizes[corner] = size;
		this.#applyMeshVars();
		void this.#store?.set('meshSizes', $state.snapshot(this.meshSizes));
	}

	setMeshMode(mode: MeshMode): void {
		this.meshMode = mode;
		this.#applyMeshVars();
		void this.#store?.set('meshMode', mode);
	}

	setMeshUnifiedColor(color: string): void {
		this.meshUnifiedColor = color;
		this.#applyMeshVars();
		void this.#store?.set('meshUnifiedColor', color);
	}

	resetMesh(): void {
		this.meshMode = MESH_MODES.CORNERS;
		this.meshColors = [...DEFAULT_MESH_COLORS];
		this.meshSizes = [...DEFAULT_MESH_SIZES];
		this.meshUnifiedColor = DEFAULT_MESH_UNIFIED_COLOR;
		this.#applyMeshVars();
		void this.#store?.set('meshMode', this.meshMode);
		void this.#store?.set('meshColors', $state.snapshot(this.meshColors));
		void this.#store?.set('meshSizes', $state.snapshot(this.meshSizes));
		void this.#store?.set('meshUnifiedColor', this.meshUnifiedColor);
	}

	setMeshEnabled(value: boolean): void {
		this.meshEnabled = value;
		this.#applyMeshVars();
		void this.#store?.set('meshEnabled', value);
	}

	#applyPrimaryVars(): void {
		const style = document.documentElement.style;
		if (this.primaryColor) {
			Object.entries(primaryColorVars(this.primaryColor)).forEach(([name, value]) => {
				style.setProperty(name, value);
			});
		} else {
			PRIMARY_COLOR_VARS.forEach((name) => style.removeProperty(name));
		}
	}

	setPrimaryColor(color: string): void {
		this.primaryColor = color;
		this.#applyPrimaryVars();
		void this.#store?.set('primaryColor', color);
	}

	resetPrimaryColor(): void {
		this.primaryColor = null;
		this.#applyPrimaryVars();
		void this.#store?.set('primaryColor', null);
	}
}

export const settingsService = new SettingsService();
