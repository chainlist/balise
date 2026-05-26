import { describe, it, expect, vi, beforeEach } from 'vitest';
// SvelteSet used by extractTags - replace with native Set for Node compatibility
vi.mock('svelte/reactivity', () => ({ SvelteSet: Set }));

vi.mock('$lib/repositories/tags.repo', () => ({
	queryTagsWithCounts: vi.fn(),
	queryUntaggedCount: vi.fn(),
	upsertTagSettings: vi.fn().mockResolvedValue(undefined),
	resolveCanonicalTags: vi.fn(),
	deleteNoteTags: vi.fn().mockResolvedValue(undefined),
	insertNoteTags: vi.fn().mockResolvedValue(undefined),
	queryRelatedTags: vi.fn()
}));
vi.mock('$lib/utils/db', () => ({ getDB: vi.fn(() => ({})) }));

import { tagsService, extractTags, tagDisplayName } from './tags.svelte';
import * as repo from '$lib/repositories/tags.repo';

const RAW_TAG = (tag = 'work', pinned = 0) => ({
	tag,
	color: null,
	display_name: null,
	pinned,
	count: 1
});

beforeEach(() => {
	vi.clearAllMocks();
	tagsService.tags = [];
	tagsService.untaggedCount = 0;
	tagsService.relatedTags = [];
});

// ─── load ─────────────────────────────────────────────────────────────────────

describe('load', () => {
	it('populates tags', async () => {
		vi.mocked(repo.queryTagsWithCounts).mockResolvedValue([RAW_TAG('work')]);
		vi.mocked(repo.queryUntaggedCount).mockResolvedValue(0);
		await tagsService.load();
		expect(tagsService.tags).toHaveLength(1);
		expect(tagsService.tags[0].tag).toBe('work');
	});

	it('converts pinned 1 to boolean true', async () => {
		vi.mocked(repo.queryTagsWithCounts).mockResolvedValue([RAW_TAG('work', 1)]);
		vi.mocked(repo.queryUntaggedCount).mockResolvedValue(0);
		await tagsService.load();
		expect(tagsService.tags[0].pinned).toBe(true);
	});

	it('converts pinned 0 to boolean false', async () => {
		vi.mocked(repo.queryTagsWithCounts).mockResolvedValue([RAW_TAG('work', 0)]);
		vi.mocked(repo.queryUntaggedCount).mockResolvedValue(0);
		await tagsService.load();
		expect(tagsService.tags[0].pinned).toBe(false);
	});

	it('sets untaggedCount from the repo', async () => {
		vi.mocked(repo.queryTagsWithCounts).mockResolvedValue([]);
		vi.mocked(repo.queryUntaggedCount).mockResolvedValue(7);
		await tagsService.load();
		expect(tagsService.untaggedCount).toBe(7);
	});
});

// ─── setSettings ──────────────────────────────────────────────────────────────

describe('setSettings', () => {
	it('calls upsertTagSettings with the tag and settings', async () => {
		await tagsService.setSettings('work', { color: '#ff0000' });
		expect(repo.upsertTagSettings).toHaveBeenCalledWith(expect.anything(), 'work', {
			color: '#ff0000'
		});
	});

	it('updates color in-memory', async () => {
		tagsService.tags = [
			{ tag: 'work', color: '#aaa', display_name: null, pinned: false, count: 1 }
		];
		await tagsService.setSettings('work', { color: '#ff0000' });
		expect(tagsService.tags[0].color).toBe('#ff0000');
	});

	it('updates display_name in-memory', async () => {
		tagsService.tags = [{ tag: 'work', color: null, display_name: null, pinned: false, count: 1 }];
		await tagsService.setSettings('work', { display_name: 'Work Tasks' });
		expect(tagsService.tags[0].display_name).toBe('Work Tasks');
	});

	it('moves a pinned tag to the front', async () => {
		tagsService.tags = [
			{ tag: 'aaa', color: null, display_name: null, pinned: false, count: 1 },
			{ tag: 'zzz', color: null, display_name: null, pinned: false, count: 1 }
		];
		await tagsService.setSettings('zzz', { pinned: true });
		expect(tagsService.tags[0].tag).toBe('zzz');
	});

	it('does not throw when the tag is not in state', async () => {
		tagsService.tags = [];
		await expect(tagsService.setSettings('ghost', { color: '#fff' })).resolves.not.toThrow();
	});
});

// ─── syncNoteTags ─────────────────────────────────────────────────────────────

describe('syncNoteTags', () => {
	it('deletes note tags and skips insert when content has no hashtags', async () => {
		vi.mocked(repo.queryTagsWithCounts).mockResolvedValue([]);
		vi.mocked(repo.queryUntaggedCount).mockResolvedValue(0);
		await tagsService.syncNoteTags('note-1', 'plain text');
		expect(repo.deleteNoteTags).toHaveBeenCalledWith(expect.anything(), 'note-1');
		expect(repo.insertNoteTags).not.toHaveBeenCalled();
	});

	it('resolves canonicals before deleting, then inserts', async () => {
		vi.mocked(repo.resolveCanonicalTags).mockResolvedValue(['work']);
		vi.mocked(repo.queryTagsWithCounts).mockResolvedValue([]);
		vi.mocked(repo.queryUntaggedCount).mockResolvedValue(0);
		await tagsService.syncNoteTags('note-1', '#work');
		expect(repo.resolveCanonicalTags).toHaveBeenCalledWith(expect.anything(), ['work']);
		expect(repo.deleteNoteTags).toHaveBeenCalled();
		expect(repo.insertNoteTags).toHaveBeenCalledWith(expect.anything(), 'note-1', ['work']);
	});

	it('calls load at the end', async () => {
		vi.mocked(repo.resolveCanonicalTags).mockResolvedValue(['work']);
		vi.mocked(repo.queryTagsWithCounts).mockResolvedValue([]);
		vi.mocked(repo.queryUntaggedCount).mockResolvedValue(0);
		await tagsService.syncNoteTags('note-1', '#work');
		// load internally calls queryTagsWithCounts + queryUntaggedCount
		expect(repo.queryTagsWithCounts).toHaveBeenCalled();
	});
});

// ─── loadRelated ──────────────────────────────────────────────────────────────

describe('loadRelated', () => {
	it('sets relatedTags to empty for __untagged__ without calling the repo', async () => {
		tagsService.relatedTags = [{ tag: 'stale', color: null, display_name: null }];
		await tagsService.loadRelated('__untagged__');
		expect(tagsService.relatedTags).toHaveLength(0);
		expect(repo.queryRelatedTags).not.toHaveBeenCalled();
	});

	it('calls queryRelatedTags with empty array when no tags active', async () => {
		vi.mocked(repo.queryRelatedTags).mockResolvedValue([]);
		await tagsService.loadRelated(null, []);
		expect(repo.queryRelatedTags).toHaveBeenCalledWith(expect.anything(), []);
	});

	it('passes activeTag + composedTags merged to queryRelatedTags', async () => {
		vi.mocked(repo.queryRelatedTags).mockResolvedValue([]);
		await tagsService.loadRelated('work', ['urgent']);
		expect(repo.queryRelatedTags).toHaveBeenCalledWith(expect.anything(), ['work', 'urgent']);
	});

	it('sets relatedTags to the returned rows', async () => {
		const tags = [{ tag: 'todo', color: null, display_name: null }];
		vi.mocked(repo.queryRelatedTags).mockResolvedValue(tags);
		await tagsService.loadRelated('work', []);
		expect(tagsService.relatedTags).toEqual(tags);
	});
});

// ─── extractTags (pure) ───────────────────────────────────────────────────────

describe('extractTags', () => {
	it('returns an empty array for plain text', () => {
		expect(extractTags('just plain text')).toHaveLength(0);
	});

	it('extracts a single hashtag', () => {
		expect(extractTags('Hello #work today')).toContain('work');
	});

	it('extracts multiple hashtags', () => {
		const tags = extractTags('#todo #urgent check this');
		expect(tags).toContain('todo');
		expect(tags).toContain('urgent');
	});

	it('strips the leading # from the tag value', () => {
		const tags = extractTags('#project');
		expect(tags).not.toContain('#project');
		expect(tags).toContain('project');
	});

	it('ignores single-character hashtags', () => {
		expect(extractTags('#a short')).not.toContain('a');
	});

	it('accepts two-character tags', () => {
		expect(extractTags('#ok')).toContain('ok');
	});

	it('deduplicates repeated tags', () => {
		const tags = extractTags('#work and #work again');
		expect(tags.filter((t) => t === 'work')).toHaveLength(1);
	});

	it('handles slash-separated hierarchical tags', () => {
		expect(extractTags('see #area/project')).toContain('area/project');
	});

	it('infers #code from a fenced code block with a language', () => {
		expect(extractTags('```typescript\nconst x = 1\n```')).toContain('code');
	});

	it('infers the language name from a fenced code block', () => {
		expect(extractTags('```typescript\nconst x = 1\n```')).toContain('typescript');
	});

	it('lowercases the inferred language tag', () => {
		expect(extractTags('```Python\nprint("hi")\n```')).toContain('python');
	});

	it('does not infer #code from a fence with no language', () => {
		expect(extractTags('```\nsome code\n```')).not.toContain('code');
	});

	it('combines hashtag and code-block tags without duplicates', () => {
		const tags = extractTags('#typescript note\n```typescript\ncode\n```');
		expect(tags.filter((t) => t === 'typescript')).toHaveLength(1);
	});
});

describe('tagDisplayName', () => {
	it('returns display_name when it is set', () => {
		expect(tagDisplayName({ display_name: 'My Project', tag: 'project' })).toBe('My Project');
	});

	it('falls back to the tag value when display_name is null', () => {
		expect(tagDisplayName({ display_name: null, tag: 'work' })).toBe('work');
	});

	it('returns an empty display_name as-is (not the tag fallback)', () => {
		expect(tagDisplayName({ display_name: '', tag: 'work' })).toBe('');
	});
});
