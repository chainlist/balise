import { getDB } from '$lib/utils/db';
import { SvelteSet } from 'svelte/reactivity';
import {
	queryTagsWithCounts,
	queryUntaggedCount,
	upsertTagSettings as dbUpsertTagSettings,
	resolveCanonicalTags,
	deleteNoteTags,
	insertNoteTags,
	queryRelatedTags
} from '$lib/repositories/tags.repo';

import type { RelatedTag } from '$lib/repositories/tags.repo';
export type { RelatedTag };

export interface Tag {
	tag: string;
	color: string | null;
	display_name: string | null;
	pinned: boolean;
	count: number;
}

export function tagDisplayName(tag: { display_name: string | null; tag: string }): string {
	return tag.display_name ?? tag.tag;
}

export function extractTags(content: string): string[] {
	const tags = new SvelteSet<string>();

	for (const [match] of content.matchAll(/#[a-zA-Z0-9/]{2,}/g)) {
		tags.add(match.slice(1));
	}

	// Magic tags: infer #code and #<lang> from fenced code blocks (``` lang)
	for (const [, lang] of content.matchAll(/^```([a-zA-Z][a-zA-Z0-9]*)/gm)) {
		tags.add('code');
		tags.add(lang.toLowerCase());
	}

	// Magic tags: infer task state tags from task list items
	if (/^[ \t]*- \[ \]/m.test(content)) tags.add('todo');
	if (/^[ \t]*- \[[xX]\]/m.test(content)) tags.add('done');
	if (/^[ \t]*- \[~\]/m.test(content)) tags.add('inprogress');

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
		if (activeTag === '__untagged__') {
			this.relatedTags = [];
			return;
		}

		const allCurrentTags = activeTag ? [activeTag, ...composedTags] : composedTags;
		this.relatedTags = await queryRelatedTags(getDB(), allCurrentTags);
	}

	async syncNoteTags(noteId: string, content: string): Promise<void> {
		const db = getDB();
		const rawNames = extractTags(content);

		// Canonical resolution MUST happen before DELETE — it reads existing rows to preserve casing
		const names = rawNames.length > 0 ? await resolveCanonicalTags(db, rawNames) : [];
		await deleteNoteTags(db, noteId);
		if (names.length > 0) await insertNoteTags(db, noteId, names);

		await this.load();
	}
}

export const tagsService = new TagsService();
