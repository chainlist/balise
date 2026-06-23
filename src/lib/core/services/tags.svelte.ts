import { tagRepo } from '$lib/core/repositories/tag.repo';
import {
	getTagsForNote,
	UNTAGGED_FILTER,
	type Tag,
	type RelatedTag,
	type TagOccurrences,
	type MagicTagRule
} from '$lib/core/domain/tag';

// Re-export the pure composers so callers that import them from the tags
// service today (Notes, Editor) keep a stable import path at cutover.
export { getTagsForNote, extractTags } from '$lib/core/domain/tag';

// Application layer: orchestration and reactive state only. No SQL, no `getDb`,
// no rules. Methods sequence repo calls and update state; the pinned re-sort is
// app ordering (not persistence), so it lives here.
class TagsService {
	tags = $state<Tag[]>([]);
	untaggedCount = $state(0);
	relatedTags = $state<RelatedTag[]>([]);
	/** Wired from settings by Concept 07; empty until then (no magic tags). */
	magicRules = $state<MagicTagRule[]>([]);

	async load(): Promise<void> {
		const [tags, count] = await Promise.all([tagRepo.withCounts(), tagRepo.untaggedCount()]);
		this.tags = tags;
		this.untaggedCount = count;
	}

	async setSettings(
		tag: string,
		settings: Partial<{ color: string; display_name: string | null; pinned: boolean }>
	): Promise<void> {
		await tagRepo.setSettings(tag, settings);
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
		this.relatedTags = await tagRepo.related(allCurrentTags);
	}

	/** No-argument tag extraction for callers (editor header) that don't hold the rules. */
	tagsForNote(content: string): TagOccurrences[] {
		return getTagsForNote(content, this.magicRules);
	}
}

export const tagsService = new TagsService();
