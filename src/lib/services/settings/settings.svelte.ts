import { load, type Store } from '@tauri-apps/plugin-store';
import { resolveStorePath } from '../platform/store-path';
import type { MarkMode } from '$lib/utils/cm';
import type { Theme } from '../app/theme.svelte';
import { setLocale, locales } from '$paraglide/runtime.js';

import { GeneralSettingsService } from './general.svelte';
import { AppearanceSettingsService } from './appearance.svelte';
import { EditorSettingsService } from './editor.svelte';
import { JournalSettingsService } from './journal.svelte';
import { MagicTagsSettingsService } from './magic-tags.svelte';
import { ShortcutsSettingsService } from './shortcuts.svelte';
import { SyncSettingsService } from './sync.svelte';
import type { GeneralSettings } from './general.svelte';
import type { MagicTag } from './magic-tags.svelte';
import type { MeshColors, MeshSizes, MeshMode } from './appearance.svelte';

export const SUPPORTED_LOCALES = locales;

/* Public re-exports so consumers can import everything from the aggregator. */
export type { GeneralSettings } from './general.svelte';
export type { EditorSettings } from './editor.svelte';
export type { JournalSettings } from './journal.svelte';
export type { ShortcutsSettings } from './shortcuts.svelte';
export {
	MESH_MODES,
	DEFAULT_MESH_COLORS,
	DEFAULT_MESH_SIZES,
	DEFAULT_MESH_UNIFIED_COLOR
} from './appearance.svelte';
export type {
	AppearanceSettings,
	MeshColors,
	MeshSizes,
	MeshMode
} from './appearance.svelte';
export { MAGIC_TAG_MATCH_TYPES, DEFAULT_MAGIC_TAGS } from './magic-tags.svelte';
export type { MagicTag, MagicTagMatchType, MagicTagsSettings } from './magic-tags.svelte';
export { SYNC_INTERVAL_OPTIONS } from './sync.svelte';
export type { SyncSettings } from './sync.svelte';

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

/**
 * Top-level orchestrator. Loads the shared store, runs the one-time legacy
 * migration, then constructs and loads each section service. Sections own their
 * own reactive state and setters; this class only wires them to the store.
 */
class SettingsService {
	general!: GeneralSettingsService;
	appearance!: AppearanceSettingsService;
	editor!: EditorSettingsService;
	journal!: JournalSettingsService;
	magicTags!: MagicTagsSettingsService;
	shortcuts!: ShortcutsSettingsService;
	sync!: SyncSettingsService;

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load(await resolveStorePath('settings.json'), { autoSave: 100 });

		await this.#migrate();

		this.general = new GeneralSettingsService(this.#store);
		this.appearance = new AppearanceSettingsService(this.#store);
		this.editor = new EditorSettingsService(this.#store);
		this.journal = new JournalSettingsService(this.#store);
		this.magicTags = new MagicTagsSettingsService(this.#store);
		this.shortcuts = new ShortcutsSettingsService(this.#store);
		this.sync = new SyncSettingsService(this.#store);

		await Promise.all([
			this.general.load(),
			this.appearance.load(),
			this.editor.load(),
			this.journal.load(),
			this.magicTags.load(),
			this.shortcuts.load(),
			this.sync.load()
		]);

		setLocale(this.general.state.language);
		this.editor.applyVars();
		this.appearance.apply();
		this.appearance.watchCrossWindow();
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
}

export const settingsService = new SettingsService();
