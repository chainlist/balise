import { settingsRepo } from '$lib/repositories/settings.repo';
import { tagsService } from '$lib/services/tags.svelte';
import { eventBus } from '$lib/services/events/event-bus';
import {
	migrateLegacySettings,
	DEFAULT_SETTINGS,
	type LegacySettings,
	type Theme,
	type MarkMode,
	type Language,
	type MagicTagRule,
	type MeshColors,
	type MeshSizes,
	type MeshMode
} from '$lib/domain/settings';
import { setLocale } from '$paraglide/runtime.js';

import { GeneralSettingsSection } from './general.svelte';
import { AppearanceSettingsSection } from './appearance.svelte';
import { EditorSettingsSection } from './editor.svelte';
import { JournalSettingsSection } from './journal.svelte';
import { MagicTagsSettingsSection } from './magic-tags.svelte';
import { ShortcutsSettingsSection } from './shortcuts.svelte';
import { SyncSettingsSection } from './sync.svelte';

/**
 * Application-layer aggregator. Loads the shared store, runs the one-time legacy
 * migration (pure mapping in the domain, reads/writes via the repo), then
 * constructs and loads each section service. Sections own their reactive state
 * and setters; this class only sequences init and wires the cross-cutting seams:
 * the magic-tag rules into `tagsService`, the desk rename/remove events into the
 * sync section, and the app-shell side effects (locale, CSS vars, cross-window
 * theme) at the boundary.
 */
class SettingsService {
	general!: GeneralSettingsSection;
	appearance!: AppearanceSettingsSection;
	editor!: EditorSettingsSection;
	journal!: JournalSettingsSection;
	magicTags!: MagicTagsSettingsSection;
	shortcuts!: ShortcutsSettingsSection;
	sync!: SyncSettingsSection;

	async init(): Promise<void> {
		await settingsRepo.load(DEFAULT_SETTINGS);
		await this.#migrate();

		this.general = new GeneralSettingsSection();
		this.appearance = new AppearanceSettingsSection();
		this.editor = new EditorSettingsSection();
		this.journal = new JournalSettingsSection();
		this.magicTags = new MagicTagsSettingsSection();
		this.shortcuts = new ShortcutsSettingsSection();
		this.sync = new SyncSettingsSection();

		// Closes the Concept 01 seam: push magic-tag rules into tagsService on load
		// and on every change. Set before load so the first push happens.
		this.magicTags.onRulesChange = (rules: MagicTagRule[]) => {
			tagsService.magicRules = rules;
		};

		await Promise.all([
			this.general.load(),
			this.appearance.load(),
			this.editor.load(),
			this.journal.load(),
			this.magicTags.load(),
			this.shortcuts.load(),
			this.sync.load()
		]);

		// App-shell side effects (revisited in Concept 08): apply locale, CSS vars,
		// and keep the theme synced across windows.
		setLocale(this.general.state.language);
		this.editor.applyVars();
		this.appearance.apply();
		this.appearance.watchCrossWindow();

		// Carry/forget a desk's sync-share choice when a desk is renamed or removed.
		eventBus.desks.renamed.on((oldName, newName) => this.sync.renameSharedDesk(oldName, newName));
		eventBus.desks.removed.on((name) => this.sync.forgetDesk(name));
	}

	/**
	 * One-time migration of the legacy flat keys into the section objects. Triggered
	 * purely by the presence of a legacy flat key (the pure mapping returns `null`
	 * when none is present), so a fresh install and an already-migrated store both
	 * no-op. The presence of a legacy key is the only reliable signal now that the
	 * section keys read back as their defaults from the store.
	 */
	async #migrate(): Promise<void> {
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
			settingsRepo.getSection<Theme>('theme'),
			settingsRepo.getSection<number>('fontSize'),
			settingsRepo.getSection<number>('lineHeight'),
			settingsRepo.getSection<MarkMode>('markdownMarks'),
			settingsRepo.getSection<Record<string, string>>('customBindings'),
			settingsRepo.getSection<Language>('language'),
			settingsRepo.getSection<MagicTagRule[]>('magicTags'),
			settingsRepo.getSection<boolean | null>('closeToTray'),
			settingsRepo.getSection<MeshColors>('meshColors'),
			settingsRepo.getSection<MeshSizes>('meshSizes'),
			settingsRepo.getSection<MeshMode>('meshMode'),
			settingsRepo.getSection<string>('meshUnifiedColor'),
			settingsRepo.getSection<boolean>('meshEnabled'),
			settingsRepo.getSection<string>('primaryColor')
		]);

		const raw: LegacySettings = {
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
		};

		const migration = migrateLegacySettings(raw);
		if (!migration) return;

		await Promise.all(
			Object.entries(migration.sections).map(([key, value]) => settingsRepo.setSection(key, value))
		);
		await settingsRepo.deleteKeys(migration.deleteKeys);
		await settingsRepo.save();
	}
}

export const settingsService = new SettingsService();
