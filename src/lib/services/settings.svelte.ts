import { load, type Store } from '@tauri-apps/plugin-store';
import { resolveStorePath } from './store-path';
import type { MarkMode } from '$lib/utils/cm';
import type { Theme } from './theme.svelte';
import { setLocale, locales } from '$paraglide/runtime.js';
import { primaryColorVars, PRIMARY_COLOR_VARS } from '$lib/utils/primary-color';
import { sanitizeDeskName } from './desk';

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

/* Settings mirror the sections of the settings modal. Each section is its own
   object, persisted under its own key in settings.json. */
export interface GeneralSettings {
	language: 'fr' | 'es' | 'en' | 'de';
	closeToTray: boolean | null;
	autoUpdate: boolean;
}

export interface AppearanceSettings {
	theme: Theme;
	primaryColor: string | null;
	meshColors: MeshColors;
	meshSizes: MeshSizes;
	meshMode: MeshMode;
	meshUnifiedColor: string;
	meshEnabled: boolean;
}

export interface EditorSettings {
	fontSize: number;
	lineHeight: number;
	markdownMarks: MarkMode;
}

export interface MagicTagsSettings {
	tags: MagicTag[];
}

export interface ShortcutsSettings {
	customBindings: Record<string, string>;
}

export interface SyncSettings {
	enabled: boolean;
	/** How often to sync with linked devices, in minutes. */
	intervalMinutes: number;
	/** Custom pairing server URL; empty falls back to the build-time default. */
	syncUrl: string;
	/** Whether this device shares its app settings (everything except sync
	 *  settings) with paired devices. */
	shareSettings: boolean;
	/** Desk names this device excludes from sync. Empty shares every desk,
	 *  including any added later. Stored sanitized so the sync gate (which only
	 *  knows the sanitized desk name) and the settings UI agree. */
	unsharedDesks: string[];
}

/** Selectable sync cadences, in minutes. */
export const SYNC_INTERVAL_OPTIONS = [1, 5, 15, 30, 60] as const;

type SectionKey = 'general' | 'appearance' | 'editor' | 'magicTags' | 'shortcuts' | 'sync';

/* Flat keys from before settings were grouped into sections; migrated once. */
const LEGACY_KEYS = [
	'theme',
	'fontSize',
	'lineHeight',
	'markdownMarks',
	'customBindings',
	'language',
	'magicTags',
	'closeToTray',
	'meshColors',
	'meshSizes',
	'meshMode',
	'meshUnifiedColor',
	'meshEnabled',
	'primaryColor'
] as const;

class SettingsService {
	general = $state<GeneralSettings>({ language: 'en', closeToTray: null, autoUpdate: true });
	appearance = $state<AppearanceSettings>({
		theme: 'system',
		primaryColor: null,
		meshColors: [...DEFAULT_MESH_COLORS],
		meshSizes: [...DEFAULT_MESH_SIZES],
		meshMode: MESH_MODES.CORNERS,
		meshUnifiedColor: DEFAULT_MESH_UNIFIED_COLOR,
		meshEnabled: true
	});
	editor = $state<EditorSettings>({ fontSize: 16, lineHeight: 1.75, markdownMarks: 'cursor' });
	magicTags = $state<MagicTagsSettings>({ tags: DEFAULT_MAGIC_TAGS });
	shortcuts = $state<ShortcutsSettings>({ customBindings: {} });
	sync = $state<SyncSettings>({
		enabled: false,
		intervalMinutes: 5,
		syncUrl: '',
		shareSettings: true,
		unsharedDesks: []
	});

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load(await resolveStorePath('settings.json'), { autoSave: 100 });

		await this.#migrate();

		const [general, appearance, editor, magicTags, shortcuts, sync] = await Promise.all([
			this.#store.get<GeneralSettings>('general'),
			this.#store.get<AppearanceSettings>('appearance'),
			this.#store.get<EditorSettings>('editor'),
			this.#store.get<MagicTagsSettings>('magicTags'),
			this.#store.get<ShortcutsSettings>('shortcuts'),
			this.#store.get<SyncSettings>('sync')
		]);

		this.general = {
			language: general?.language ?? 'en',
			closeToTray: general?.closeToTray ?? null,
			autoUpdate: general?.autoUpdate ?? true
		};
		this.appearance = {
			theme: appearance?.theme ?? 'system',
			primaryColor: appearance?.primaryColor ?? null,
			meshColors: appearance?.meshColors ?? [...DEFAULT_MESH_COLORS],
			meshSizes: appearance?.meshSizes ?? [...DEFAULT_MESH_SIZES],
			meshMode: appearance?.meshMode ?? MESH_MODES.CORNERS,
			meshUnifiedColor: appearance?.meshUnifiedColor ?? DEFAULT_MESH_UNIFIED_COLOR,
			meshEnabled: appearance?.meshEnabled ?? true
		};
		this.editor = {
			fontSize: editor?.fontSize ?? 16,
			lineHeight: editor?.lineHeight ?? 1.75,
			markdownMarks: editor?.markdownMarks ?? 'cursor'
		};
		this.magicTags = {
			tags: (magicTags?.tags ?? DEFAULT_MAGIC_TAGS).map(({ matchType, ...rest }) => ({
				...rest,
				matchType: (matchType as MagicTagMatchType | undefined) ?? MAGIC_TAG_MATCH_TYPES.CONTAINS
			}))
		};
		this.shortcuts = {
			customBindings: shortcuts?.customBindings ?? {}
		};
		this.sync = {
			enabled: sync?.enabled ?? false,
			intervalMinutes: sync?.intervalMinutes ?? 5,
			syncUrl: sync?.syncUrl ?? '',
			shareSettings: sync?.shareSettings ?? true,
			unsharedDesks: sync?.unsharedDesks ?? []
		};

		setLocale(this.general.language);
		this.#applyEditorVars();
		this.#applyMeshVars();
		this.#applyPrimaryVars();

		/* Keep theme in sync across windows (main <-> quick add) */
		void this.#store.onKeyChange<AppearanceSettings>('appearance', (appearance) => {
			this.appearance.theme = appearance?.theme ?? 'system';
		});
	}

	/**
	 * One-time migration of the legacy flat keys (theme, fontSize, ...) into the
	 * section objects. Runs before load and is idempotent: it skips once the
	 * section keys exist, and does nothing on a fresh install.
	 */
	async #migrate(): Promise<void> {
		const store = this.#store!;
		if ((await store.get('appearance')) !== undefined) return;

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
			store.get<Theme>('theme'),
			store.get<number>('fontSize'),
			store.get<number>('lineHeight'),
			store.get<MarkMode>('markdownMarks'),
			store.get<Record<string, string>>('customBindings'),
			store.get<GeneralSettings['language']>('language'),
			store.get<MagicTag[]>('magicTags'),
			store.get<boolean>('closeToTray'),
			store.get<MeshColors>('meshColors'),
			store.get<MeshSizes>('meshSizes'),
			store.get<MeshMode>('meshMode'),
			store.get<string>('meshUnifiedColor'),
			store.get<boolean>('meshEnabled'),
			store.get<string>('primaryColor')
		]);

		const hasLegacy = [
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
		].some((value) => value !== undefined);
		if (!hasLegacy) return;

		await store.set('general', { language, closeToTray });
		await store.set('appearance', {
			theme,
			primaryColor,
			meshColors,
			meshSizes,
			meshMode,
			meshUnifiedColor,
			meshEnabled
		});
		await store.set('editor', { fontSize, lineHeight, markdownMarks });
		await store.set('magicTags', { tags: magicTags });
		await store.set('shortcuts', { customBindings });

		await Promise.all(LEGACY_KEYS.map((key) => store.delete(key)));
		await store.save();
	}

	#persist(section: SectionKey): void {
		void this.#store?.set(section, $state.snapshot(this[section]));
	}

	#applyEditorVars(): void {
		document.documentElement.style.setProperty('--editor-font-size', `${this.editor.fontSize}px`);
		document.documentElement.style.setProperty('--editor-line-height', `${this.editor.lineHeight}`);
	}

	#applyMeshVars(): void {
		const style = document.documentElement.style;
		const { meshEnabled, meshMode, meshColors, meshSizes, meshUnifiedColor } = this.appearance;
		const cornersVisible = meshEnabled && meshMode === MESH_MODES.CORNERS;
		MESH_CSS_VARS.forEach((cssVar, i) => {
			style.setProperty(cssVar, cornersVisible ? meshColors[i] : 'transparent');
		});
		MESH_SIZE_CSS_VARS.forEach((cssVar, i) => {
			style.setProperty(cssVar, `${meshSizes[i]}`);
		});
		style.setProperty(
			'--mesh-unified',
			meshEnabled && meshMode === MESH_MODES.UNIFIED ? meshUnifiedColor : 'transparent'
		);
	}

	setTheme(theme: Theme): void {
		this.appearance.theme = theme;
		this.#persist('appearance');
	}

	setFontSize(size: number): void {
		this.editor.fontSize = size;
		this.#applyEditorVars();
		this.#persist('editor');
	}

	setLineHeight(value: number): void {
		this.editor.lineHeight = value;
		this.#applyEditorVars();
		this.#persist('editor');
	}

	setMarkdownMarks(value: MarkMode): void {
		this.editor.markdownMarks = value;
		this.#persist('editor');
	}

	async setLanguage(lang: string): Promise<void> {
		this.general.language = lang as GeneralSettings['language'];
		if (this.#store) {
			await this.#store.set('general', $state.snapshot(this.general));
			await this.#store.save();
		}
	}

	setBinding(id: string, binding: string): void {
		this.shortcuts.customBindings = { ...this.shortcuts.customBindings, [id]: binding };
		this.#persist('shortcuts');
	}

	resetBinding(id: string): void {
		const next = { ...this.shortcuts.customBindings };
		delete next[id];
		this.shortcuts.customBindings = next;
		this.#persist('shortcuts');
	}

	setMagicTags(tags: MagicTag[]): void {
		this.magicTags.tags = tags;
		this.#persist('magicTags');
	}

	setCloseToTray(value: boolean): void {
		this.general.closeToTray = value;
		this.#persist('general');
	}

	setAutoUpdate(value: boolean): void {
		this.general.autoUpdate = value;
		this.#persist('general');
	}

	setSyncEnabled(value: boolean): void {
		this.sync.enabled = value;
		this.#persist('sync');
	}

	setSyncInterval(minutes: number): void {
		this.sync.intervalMinutes = minutes;
		this.#persist('sync');
	}

	setSyncUrl(url: string): void {
		this.sync.syncUrl = url;
		this.#persist('sync');
	}

	setShareSettings(value: boolean): void {
		this.sync.shareSettings = value;
		this.#persist('sync');
	}

	/** Whether `desk` syncs with paired devices. Unknown/empty desks default to shared. */
	isDeskShared(desk: string): boolean {
		if (!desk.trim()) return true;
		return !this.sync.unsharedDesks.includes(sanitizeDeskName(desk));
	}

	setDeskShared(desk: string, shared: boolean): void {
		const safe = sanitizeDeskName(desk);
		const without = this.sync.unsharedDesks.filter((d) => d !== safe);
		this.sync.unsharedDesks = shared ? without : [...without, safe];
		this.#persist('sync');
	}

	/** Carries a desk's share choice across a rename. */
	renameSharedDesk(oldDesk: string, newDesk: string): void {
		const oldSafe = sanitizeDeskName(oldDesk);
		if (!this.sync.unsharedDesks.includes(oldSafe)) return;
		const newSafe = sanitizeDeskName(newDesk);
		this.sync.unsharedDesks = this.sync.unsharedDesks.map((d) => (d === oldSafe ? newSafe : d));
		this.#persist('sync');
	}

	/** Drops a deleted desk's stale share entry. */
	forgetDesk(desk: string): void {
		const safe = sanitizeDeskName(desk);
		if (!this.sync.unsharedDesks.includes(safe)) return;
		this.sync.unsharedDesks = this.sync.unsharedDesks.filter((d) => d !== safe);
		this.#persist('sync');
	}

	setMeshColor(corner: number, color: string): void {
		this.appearance.meshColors[corner] = color;
		this.#applyMeshVars();
		this.#persist('appearance');
	}

	setMeshSize(corner: number, size: number): void {
		this.appearance.meshSizes[corner] = size;
		this.#applyMeshVars();
		this.#persist('appearance');
	}

	setMeshMode(mode: MeshMode): void {
		this.appearance.meshMode = mode;
		this.#applyMeshVars();
		this.#persist('appearance');
	}

	setMeshUnifiedColor(color: string): void {
		this.appearance.meshUnifiedColor = color;
		this.#applyMeshVars();
		this.#persist('appearance');
	}

	resetMesh(): void {
		this.appearance.meshMode = MESH_MODES.CORNERS;
		this.appearance.meshColors = [...DEFAULT_MESH_COLORS];
		this.appearance.meshSizes = [...DEFAULT_MESH_SIZES];
		this.appearance.meshUnifiedColor = DEFAULT_MESH_UNIFIED_COLOR;
		this.#applyMeshVars();
		this.#persist('appearance');
	}

	setMeshEnabled(value: boolean): void {
		this.appearance.meshEnabled = value;
		this.#applyMeshVars();
		this.#persist('appearance');
	}

	#applyPrimaryVars(): void {
		const style = document.documentElement.style;
		if (this.appearance.primaryColor) {
			Object.entries(primaryColorVars(this.appearance.primaryColor)).forEach(([name, value]) => {
				style.setProperty(name, value);
			});
		} else {
			PRIMARY_COLOR_VARS.forEach((name) => style.removeProperty(name));
		}
	}

	setPrimaryColor(color: string): void {
		this.appearance.primaryColor = color;
		this.#applyPrimaryVars();
		this.#persist('appearance');
	}

	resetPrimaryColor(): void {
		this.appearance.primaryColor = null;
		this.#applyPrimaryVars();
		this.#persist('appearance');
	}
}

export const settingsService = new SettingsService();
