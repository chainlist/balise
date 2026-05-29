import { getDB } from '$lib/utils/db';
import { TAG_PATTERN_SOURCE } from '$lib/utils/tag-parser';

import {
	queryTagsWithCounts,
	queryUntaggedCount,
	upsertTagSettings as dbUpsertTagSettings,
	resolveCanonicalTags,
	deleteNoteTags,
	insertNoteTags,
	queryRelatedTags
} from '$lib/repositories/tags.repo';

import type { Tag, RelatedTag } from '$lib/models/tag';
export type { Tag, RelatedTag } from '$lib/models/tag';

export const UNTAGGED_FILTER = '__untagged__' as const;

export function tagDisplayName(tag: { display_name: string | null; tag: string }): string {
	return tag.display_name ?? tag.tag;
}

export function extractTags(content: string): string[] {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const tags = new Set<string>();
	// Group 1: hashtag name; Group 2: hashtag param (unused); Group 3: code fence lang; Group 4: task state char ( , x/X, ~)
	const pattern = new RegExp(
		TAG_PATTERN_SOURCE + '|^```([a-zA-Z][a-zA-Z0-9]*)|^[ \\t]*- \\[( |[xX]|~)\\]',
		'gm'
	);

	for (const match of content.matchAll(pattern)) {
		if (match[1] !== undefined) {
			tags.add(match[1]);
		} else if (match[3] !== undefined) {
			tags.add('code');
			tags.add(match[3].toLowerCase());
		} else if (match[4] !== undefined) {
			if (match[4] === ' ') tags.add('todo');
			else if (match[4] === '~') tags.add('inprogress');
			else tags.add('done');
		}
	}

	return [...tags];
}

class TagsService {
	tags = $state<Tag[]>([]);
	untaggedCount = $state(0);
	relatedTags = $state<RelatedTag[]>([]);

	async load(): Promise<void> {
		const db = getDB();
		const [raw, count] = await Promise.all([queryTagsWithCounts(db), queryUntaggedCount(db)]);
		this.tags = raw.map((t) => ({ ...t, pinned: t.pinned === 1 }));
		this.untaggedCount = count;
	}

	async setSettings(
		tag: string,
		settings: Partial<{ color: string; display_name: string | null; pinned: boolean }>
	): Promise<void> {
		await dbUpsertTagSettings(getDB(), tag, settings);
		const updated = this.tags.find((t) => t.tag === tag);
		if (updated) {
			if (settings.color) updated.color = settings.color;
			if (settings.display_name !== undefined) updated.display_name = settings.display_name;
			if (settings.pinned !== undefined) {
				updated.pinned = settings.pinned;
				this.tags.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.tag.localeCompare(b.tag));
			}
		}
	}

	async loadRelated(activeTag: string | null, composedTags: string[] = []): Promise<void> {
		if (activeTag === UNTAGGED_FILTER) {
			this.relatedTags = [];
			return;
		}

		const allCurrentTags = activeTag ? [activeTag, ...composedTags] : composedTags;
		this.relatedTags = await queryRelatedTags(getDB(), allCurrentTags);
	}

	async syncNoteTags(noteId: string, content: string): Promise<void> {
		const db = getDB();
		const rawNames = extractTags(content);

		// Canonical resolution MUST happen before DELETE - it reads existing rows to preserve casing
		const names = rawNames.length > 0 ? await resolveCanonicalTags(db, rawNames) : [];
		await deleteNoteTags(db, noteId);
		if (names.length > 0) await insertNoteTags(db, noteId, names);

		await this.load();
	}
}

export const tagsService = new TagsService();
