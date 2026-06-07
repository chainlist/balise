import { getDB } from '$lib/utils/db';
import { TAG_PATTERN_SOURCE } from '$lib/utils/tag-parser';
import { SYSTEM_TAGS } from '$lib/utils/tag-constants';

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

export const UNTAGGED_FILTER = '__untagged__' as const;

export function tagDisplayName(tag: { display_name: string | null; tag: string }): string {
	return tag.display_name ?? tag.tag;
}

function extractHashtags(content: string): string[] {
	return [...content.matchAll(new RegExp(TAG_PATTERN_SOURCE, 'gm'))].map((m) => m[1]);
}

function extractCodeTags(content: string): string[] {
	const tags: string[] = [];
	for (const [, lang] of content.matchAll(/^```([a-zA-Z][a-zA-Z0-9]*)/gm)) {
		tags.push('code', lang.toLowerCase());
	}
	return tags;
}

function extractChecklistTags(content: string): string[] {
	const tags: string[] = [];
	for (const [, marker] of content.matchAll(/^[ \t]*- \[( |[xX]|~)\]/gm)) {
		if (marker === ' ') tags.push(SYSTEM_TAGS.TODO);
		else if (marker === '~') tags.push(SYSTEM_TAGS.INPROGRESS);
		else tags.push(SYSTEM_TAGS.DONE);
	}
	return tags;
}

export function extractTags(content: string): string[] {
	return [
		...new Set([
			...extractHashtags(content),
			...extractCodeTags(content),
			...extractChecklistTags(content)
		])
	];
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
				this.tags.sort(
					(a, b) =>
						Number(b.pinned) - Number(a.pinned) ||
						a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' })
				);
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
