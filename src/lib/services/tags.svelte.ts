import { getDB } from '$lib/utils/db';
import { TAG_PATTERN_SOURCE } from '$lib/utils/tag-parser';
import { settingsService, MAGIC_TAG_MATCH_TYPES } from './settings.svelte';

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

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMagicTags(content: string): string[] {
	const magicTags = settingsService.magicTags;
	if (magicTags.length === 0) return [];

	const found = new Set<string>();

	for (const matchType of Object.values(MAGIC_TAG_MATCH_TYPES)) {
		const ofType = magicTags.filter((t) => t.matchType === matchType);
		if (ofType.length === 0) continue;

		let re: RegExp;
		if (matchType === MAGIC_TAG_MATCH_TYPES.CONTAINS_WORD) {
			const groups = ofType
				.map(({ pattern }) => `(?:(?<=^|[ \\t])(${escapeRegex(pattern)})(?=[ \\t]|$))`)
				.join('|');
			re = new RegExp(groups, 'gm');
		} else {
			const groups = ofType.map(({ pattern }) => `(${escapeRegex(pattern)})`).join('|');
			if (matchType === MAGIC_TAG_MATCH_TYPES.STARTS_WITH)
				re = new RegExp(`^[ \\t]*(?:${groups})`, 'gm');
			else if (matchType === MAGIC_TAG_MATCH_TYPES.ENDS_WITH)
				re = new RegExp(`(?:${groups})[ \\t]*$`, 'gm');
			else re = new RegExp(`(?:${groups})`, 'gm');
		}

		for (const match of content.matchAll(re)) {
			const idx = match.slice(1).findIndex((g) => g !== undefined);
			if (idx >= 0) found.add(ofType[idx].tag);
		}
	}

	return [...found];
}

export function extractTags(content: string): string[] {
	return [
		...new Set([
			...extractHashtags(content),
			...extractCodeTags(content),
			...extractMagicTags(content)
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
