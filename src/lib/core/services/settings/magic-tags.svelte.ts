import { SettingsSection } from './base.svelte';
import { settingsRepo } from '$lib/core/repositories/settings.repo';
import {
	DEFAULT_MAGIC_TAGS,
	normalizeMagicRules,
	type MagicTagsSettings,
	type MagicTagRule
} from '$lib/core/domain/settings';

export class MagicTagsSettingsSection extends SettingsSection<MagicTagsSettings> {
	readonly key = 'magicTags';
	state = $state<MagicTagsSettings>({ tags: [...DEFAULT_MAGIC_TAGS] });

	/** Set by the aggregator to push the current rules into `tagsService`
	 *  (closes the Concept 01 magic-tag seam). Fires on load and on every change. */
	onRulesChange?: (rules: MagicTagRule[]) => void;

	/** Older stored tags may lack a `matchType`; the domain defaults those. */
	async load(): Promise<void> {
		const stored = await settingsRepo.getSection<MagicTagsSettings>(this.key);
		if (stored?.tags) this.state = { tags: normalizeMagicRules(stored.tags) };
		this.#notify();
	}

	setMagicTags(tags: MagicTagRule[]): void {
		this.state.tags = tags;
		this.persist();
		this.#notify();
	}

	#notify(): void {
		this.onRulesChange?.(this.state.tags);
	}
}
