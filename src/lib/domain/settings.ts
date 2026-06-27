// Settings domain: the pure shape of every settings section, their defaults, the
// per-section validation, and the one-time legacy-key migration mapping. No I/O,
// no Svelte, no Tauri. The store IO is the settings repository and the reactive
// section state lives in the settings services. Magic-tag rules reuse the shared
// `MagicTagRule` shape from the tag domain (Concept 01), so Settings depends on
// Tags here, never the reverse.

import { MAGIC_TAG_MATCH_TYPES, type MagicTagRule, type MagicTagMatchType } from './tag';

export { MAGIC_TAG_MATCH_TYPES };
export type { MagicTagRule, MagicTagMatchType };

// ─── Shared value types ──────────────────────────────────────────────────────
// These unions are owned by other layers (the CodeMirror editor's `MarkMode`, the
// app-shell theme, the date-format util). They are mirrored here as plain string
// unions so the settings domain stays import-pure (domain imports domain only);
// the values stay structurally assignable to the canonical definitions, and
// cutover/Concept 08 can unify them.

export type Theme = 'light' | 'dark' | 'system';
export type MarkMode = 'always' | 'cursor' | 'never';
export type DateFormat = 'short' | 'medium' | 'long' | 'full' | 'iso';
export type Language = 'fr' | 'es' | 'en' | 'de';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['fr', 'es', 'en', 'de'];

// ─── Appearance: mesh background ───────────────────────────────────────────────

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

// ─── Section shapes ────────────────────────────────────────────────────────────

export interface GeneralSettings {
	language: Language;
	closeToTray: boolean | null;
	autoUpdate: boolean;
	dateFormat: DateFormat;
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
	/** Installed OS font-family name for the editor text. Empty = app default. */
	fontFamily: string;
}

export interface JournalSettings {
	collapseByDefault: boolean;
}

export interface MagicTagsSettings {
	tags: MagicTagRule[];
}

export interface ShortcutsSettings {
	customBindings: Record<string, string>;
}

export interface SyncSettings {
	enabled: boolean;
	/** Throttle: the shortest time between automatic syncs, in minutes. */
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

// ─── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
	language: 'en',
	closeToTray: null,
	autoUpdate: true,
	dateFormat: 'medium'
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
	theme: 'system',
	primaryColor: null,
	meshColors: [...DEFAULT_MESH_COLORS],
	meshSizes: [...DEFAULT_MESH_SIZES],
	meshMode: MESH_MODES.CORNERS,
	meshUnifiedColor: DEFAULT_MESH_UNIFIED_COLOR,
	meshEnabled: true
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
	fontSize: 16,
	lineHeight: 1.75,
	markdownMarks: 'cursor',
	fontFamily: ''
};

export const DEFAULT_JOURNAL_SETTINGS: JournalSettings = {
	collapseByDefault: false
};

export const DEFAULT_MAGIC_TAGS: MagicTagRule[] = [
	{ pattern: '- [ ]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH, tag: 'todo' },
	{ pattern: '- [x]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH, tag: 'done' }
];

export const DEFAULT_MAGIC_TAGS_SETTINGS: MagicTagsSettings = { tags: DEFAULT_MAGIC_TAGS };

export const DEFAULT_SHORTCUTS_SETTINGS: ShortcutsSettings = { customBindings: {} };

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
	enabled: false,
	intervalMinutes: 5,
	syncUrl: '',
	shareSettings: true,
	unsharedDesks: []
};

/** Selectable throttle windows, in minutes. */
export const SYNC_INTERVAL_OPTIONS = [5, 10, 30, 60] as const;

/** Every section default keyed by its store key, for the store's `defaults` option
 *  so an absent section reads back as its defaults. Legacy flat keys are absent
 *  here on purpose, so they stay the migration trigger. */
export const DEFAULT_SETTINGS = {
	general: DEFAULT_GENERAL_SETTINGS,
	appearance: DEFAULT_APPEARANCE_SETTINGS,
	editor: DEFAULT_EDITOR_SETTINGS,
	journal: DEFAULT_JOURNAL_SETTINGS,
	magicTags: DEFAULT_MAGIC_TAGS_SETTINGS,
	shortcuts: DEFAULT_SHORTCUTS_SETTINGS,
	sync: DEFAULT_SYNC_SETTINGS
};

// ─── Validation ──────────────────────────────────────────────────────────────

/** Editor font-size bounds (px); the stepper steps by 1. */
export const EDITOR_FONT_SIZE = { min: 12, max: 42 } as const;
/** Editor line-height bounds; the stepper steps by 0.05. */
export const EDITOR_LINE_HEIGHT = { min: 1.2, max: 2.5 } as const;

/** Round to a whole px and clamp into the editor font-size range. */
export function clampFontSize(size: number): number {
	return Math.min(EDITOR_FONT_SIZE.max, Math.max(EDITOR_FONT_SIZE.min, Math.round(size)));
}

/** Snap to the 0.05 step and clamp into the editor line-height range. */
export function clampLineHeight(value: number): number {
	const snapped = Math.round(value * 20) / 20;
	return Math.min(EDITOR_LINE_HEIGHT.max, Math.max(EDITOR_LINE_HEIGHT.min, snapped));
}

/** Coerce an arbitrary stored/selected language to a supported one (default `en`). */
export function normalizeLanguage(lang: string): Language {
	return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang) ? (lang as Language) : 'en';
}

/** Stored magic tags may predate `matchType`; default those to `contains`. */
export function normalizeMagicRules(
	raw: ReadonlyArray<{ tag: string; pattern: string; matchType?: MagicTagMatchType }>
): MagicTagRule[] {
	return raw.map(({ tag, pattern, matchType }) => ({
		tag,
		pattern,
		matchType: matchType ?? MAGIC_TAG_MATCH_TYPES.CONTAINS
	}));
}

// ─── Legacy-key migration ──────────────────────────────────────────────────────
// Before settings were grouped into sections they were stored as flat keys. This
// is a one-time, pure mapping from those flat keys to the section objects plus the
// keys to delete afterwards; the repository performs the reads and writes.

/** Flat keys from the pre-section era, deleted once migrated. */
export const LEGACY_SETTING_KEYS = [
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

export interface LegacySettings {
	theme?: Theme;
	fontSize?: number;
	lineHeight?: number;
	markdownMarks?: MarkMode;
	customBindings?: Record<string, string>;
	language?: Language;
	magicTags?: MagicTagRule[];
	closeToTray?: boolean | null;
	meshColors?: MeshColors;
	meshSizes?: MeshSizes;
	meshMode?: MeshMode;
	meshUnifiedColor?: string;
	meshEnabled?: boolean;
	primaryColor?: string | null;
}

export interface SettingsMigration {
	sections: {
		general: Partial<GeneralSettings>;
		appearance: Partial<AppearanceSettings>;
		editor: Partial<EditorSettings>;
		magicTags: Partial<MagicTagsSettings>;
		shortcuts: Partial<ShortcutsSettings>;
	};
	deleteKeys: string[];
}

/** Copy only the defined entries, so a migrated section never clobbers a default
 *  with `undefined` on the shallow merge at load time. */
function definedOnly<T extends object>(obj: T): Partial<T> {
	const out: Partial<T> = {};
	for (const key of Object.keys(obj) as (keyof T)[]) {
		if (obj[key] !== undefined) out[key] = obj[key];
	}
	return out;
}

/**
 * Map the legacy flat keys (`theme`, `fontSize`, ...) into grouped section objects
 * plus the keys to delete. Returns `null` when no legacy key is present (a fresh
 * install or an already-migrated store), so the caller does nothing.
 *
 * `magicTags` is special: the flat key name equals the new section key, and the
 * store seeds it from the section default, so the legacy probe reads back the
 * section object `{ tags: [...] }`, never `undefined`. Only a flat array is genuine
 * legacy data; treating the section object as legacy would re-run this "one-time"
 * migration on every startup and wipe the other sections.
 */
export function migrateLegacySettings(raw: LegacySettings): SettingsMigration | null {
	const legacyMagicTags = Array.isArray(raw.magicTags) ? raw.magicTags : undefined;

	const hasLegacy =
		legacyMagicTags !== undefined ||
		Object.entries(raw).some(([key, value]) => key !== 'magicTags' && value !== undefined);
	if (!hasLegacy) return null;

	return {
		sections: {
			general: definedOnly({ language: raw.language, closeToTray: raw.closeToTray }),
			appearance: definedOnly({
				theme: raw.theme,
				primaryColor: raw.primaryColor,
				meshColors: raw.meshColors,
				meshSizes: raw.meshSizes,
				meshMode: raw.meshMode,
				meshUnifiedColor: raw.meshUnifiedColor,
				meshEnabled: raw.meshEnabled
			}),
			editor: definedOnly({
				fontSize: raw.fontSize,
				lineHeight: raw.lineHeight,
				markdownMarks: raw.markdownMarks
			}),
			magicTags: legacyMagicTags !== undefined ? { tags: legacyMagicTags } : {},
			shortcuts: raw.customBindings !== undefined ? { customBindings: raw.customBindings } : {}
		},
		// `magicTags` aliases the live section key, so the section write above replaces
		// the flat array in place; deleting it would wipe the just-migrated section.
		deleteKeys: LEGACY_SETTING_KEYS.filter((key) => key !== 'magicTags')
	};
}
