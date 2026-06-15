import { SettingsGroup } from './base.svelte';

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

export interface MagicTagsSettings {
	tags: MagicTag[];
}

export class MagicTagsSettingsService extends SettingsGroup<MagicTagsSettings> {
	readonly key = 'magicTags';
	state = $state<MagicTagsSettings>({ tags: DEFAULT_MAGIC_TAGS });

	/** Older stored tags may lack a matchType; default those to CONTAINS. */
	async load(): Promise<void> {
		const stored = await this.store.get<MagicTagsSettings>(this.key);
		if (!stored?.tags) return;
		this.state = {
			tags: stored.tags.map(({ matchType, ...rest }) => ({
				...rest,
				matchType: (matchType as MagicTagMatchType | undefined) ?? MAGIC_TAG_MATCH_TYPES.CONTAINS
			}))
		};
	}

	setMagicTags(tags: MagicTag[]): void {
		this.state.tags = tags;
		this.persist();
	}
}
