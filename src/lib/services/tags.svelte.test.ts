import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDB = vi.hoisted(() => ({ select: vi.fn(), execute: vi.fn() }));

vi.mock('$lib/utils/db', () => ({ getDB: () => mockDB }));

import {
	tagState,
	loadTags,
	setTagSettings,
	syncNoteTags,
	loadRelatedTags
} from './tags.svelte';

const RAW_TAG = (tag = 'work', pinned = 0) => ({
	tag,
	color: null,
	display_name: null,
	pinned,
	count: 1
});

beforeEach(() => {
	vi.clearAllMocks();
	tagState.tags = [];
	tagState.untaggedCount = 0;
	tagState.relatedTags = [];
});

// ─── loadTags ─────────────────────────────────────────────────────────────────

describe('loadTags', () => {
	it('populates tagState.tags from the database', async () => {
		mockDB.select
			.mockResolvedValueOnce([RAW_TAG('work')])
			.mockResolvedValueOnce([{ count: 0 }]);
		await loadTags();
		expect(tagState.tags).toHaveLength(1);
		expect(tagState.tags[0].tag).toBe('work');
	});

	it('converts numeric pinned 1 to boolean true', async () => {
		mockDB.select
			.mockResolvedValueOnce([RAW_TAG('work', 1)])
			.mockResolvedValueOnce([{ count: 0 }]);
		await loadTags();
		expect(tagState.tags[0].pinned).toBe(true);
	});

	it('converts numeric pinned 0 to boolean false', async () => {
		mockDB.select
			.mockResolvedValueOnce([RAW_TAG('work', 0)])
			.mockResolvedValueOnce([{ count: 0 }]);
		await loadTags();
		expect(tagState.tags[0].pinned).toBe(false);
	});

	it('sets untaggedCount from the database', async () => {
		mockDB.select
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ count: 7 }]);
		await loadTags();
		expect(tagState.untaggedCount).toBe(7);
	});

	it('defaults untaggedCount to 0 when the query returns nothing', async () => {
		mockDB.select.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
		await loadTags();
		expect(tagState.untaggedCount).toBe(0);
	});

	it('replaces tagState.tags entirely on each call', async () => {
		tagState.tags = [{ tag: 'old', color: null, display_name: null, pinned: false, count: 1 }];
		mockDB.select
			.mockResolvedValueOnce([RAW_TAG('new')])
			.mockResolvedValueOnce([{ count: 0 }]);
		await loadTags();
		expect(tagState.tags).toHaveLength(1);
		expect(tagState.tags[0].tag).toBe('new');
	});
});

// ─── setTagSettings ───────────────────────────────────────────────────────────

describe('setTagSettings', () => {
	beforeEach(() => {
		mockDB.execute.mockResolvedValue(undefined);
	});

	it('upserts tag settings into the database', async () => {
		await setTagSettings('work', { color: '#ff0000' });
		expect(mockDB.execute).toHaveBeenCalledWith(
			expect.stringContaining('INSERT INTO tag_settings'),
			expect.anything()
		);
	});

	it('updates the color in-memory', async () => {
		tagState.tags = [{ tag: 'work', color: '#aaa', display_name: null, pinned: false, count: 1 }];
		await setTagSettings('work', { color: '#ff0000' });
		expect(tagState.tags[0].color).toBe('#ff0000');
	});

	it('updates display_name in-memory', async () => {
		tagState.tags = [{ tag: 'work', color: null, display_name: null, pinned: false, count: 1 }];
		await setTagSettings('work', { display_name: 'Work Tasks' });
		expect(tagState.tags[0].display_name).toBe('Work Tasks');
	});

	it('clears display_name when set to null', async () => {
		tagState.tags = [{ tag: 'work', color: null, display_name: 'Old', pinned: false, count: 1 }];
		await setTagSettings('work', { display_name: null });
		expect(tagState.tags[0].display_name).toBeNull();
	});

	it('sets pinned to true in-memory', async () => {
		tagState.tags = [{ tag: 'work', color: null, display_name: null, pinned: false, count: 1 }];
		await setTagSettings('work', { pinned: true });
		expect(tagState.tags[0].pinned).toBe(true);
	});

	it('moves a newly-pinned tag to the front of the sorted list', async () => {
		tagState.tags = [
			{ tag: 'aaa', color: null, display_name: null, pinned: false, count: 1 },
			{ tag: 'zzz', color: null, display_name: null, pinned: false, count: 1 }
		];
		await setTagSettings('zzz', { pinned: true });
		expect(tagState.tags[0].tag).toBe('zzz');
	});

	it('does not throw when the tag is not found in the in-memory list', async () => {
		tagState.tags = [];
		await expect(setTagSettings('ghost', { color: '#fff' })).resolves.not.toThrow();
	});
});

// ─── syncNoteTags ─────────────────────────────────────────────────────────────

describe('syncNoteTags', () => {
	it('deletes all tags for the note when content has no hashtags', async () => {
		mockDB.execute.mockResolvedValue(undefined);
		// loadTags() internal calls
		mockDB.select
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ count: 0 }]);
		await syncNoteTags('note-1', 'plain text without tags');
		const [sql, params] = mockDB.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('DELETE FROM note_tags');
		expect(params).toContain('note-1');
	});

	it('does not insert any rows when content has no hashtags', async () => {
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ count: 0 }]);
		await syncNoteTags('note-1', 'plain text');
		const insertCalls = mockDB.execute.mock.calls.filter(([sql]: [string]) =>
			sql.includes('INSERT')
		);
		expect(insertCalls).toHaveLength(0);
	});

	it('deletes and then inserts rows when content has tags', async () => {
		// canonical resolution select
		mockDB.select
			.mockResolvedValueOnce([{ canonical: 'work' }])
			// loadTags internal calls
			.mockResolvedValueOnce([RAW_TAG('work')])
			.mockResolvedValueOnce([{ count: 0 }]);
		mockDB.execute.mockResolvedValue(undefined);

		await syncNoteTags('note-1', '#work');

		const deleteCalls = mockDB.execute.mock.calls.filter(([sql]: [string]) =>
			sql.includes('DELETE FROM note_tags')
		);
		const insertCalls = mockDB.execute.mock.calls.filter(([sql]: [string]) =>
			sql.includes('INSERT OR IGNORE INTO note_tags')
		);
		expect(deleteCalls).toHaveLength(1);
		expect(insertCalls).toHaveLength(1);
	});

	it('passes the note id to the INSERT statement', async () => {
		mockDB.select
			.mockResolvedValueOnce([{ canonical: 'work' }])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ count: 0 }]);
		mockDB.execute.mockResolvedValue(undefined);

		await syncNoteTags('note-42', '#work');

		const [, params] = mockDB.execute.mock.calls.find(([sql]: [string]) =>
			sql.includes('INSERT OR IGNORE INTO note_tags')
		) as [string, unknown[]];
		expect(params).toContain('note-42');
	});
});

// ─── loadRelatedTags ──────────────────────────────────────────────────────────

describe('loadRelatedTags', () => {
	it('sets relatedTags to empty and skips the DB when activeTag is __untagged__', async () => {
		tagState.relatedTags = [{ tag: 'stale', color: null, display_name: null }];
		await loadRelatedTags('__untagged__');
		expect(tagState.relatedTags).toHaveLength(0);
		expect(mockDB.select).not.toHaveBeenCalled();
	});

	it('loads all tags when no active or composed tags are set', async () => {
		const all = [{ tag: 'work', color: null, display_name: null }];
		mockDB.select.mockResolvedValue(all);
		await loadRelatedTags(null, []);
		expect(tagState.relatedTags).toEqual(all);
		const [sql] = mockDB.select.mock.calls[0] as [string];
		expect(sql).not.toContain('EXISTS');
	});

	it('excludes the active tag from related results', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadRelatedTags('work', []);
		const [sql] = mockDB.select.mock.calls[0] as [string];
		expect(sql).toContain('LOWER(nt.tag) != LOWER($1)');
	});

	it('parameterises the active tag value', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadRelatedTags('work', []);
		const [, params] = mockDB.select.mock.calls[0] as [string, string[]];
		expect(params).toContain('work');
	});

	it('includes an EXISTS clause for the active tag and every composed tag', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadRelatedTags('work', ['urgent', 'todo']);
		const [sql] = mockDB.select.mock.calls[0] as [string];
		// allCurrentTags = ['work', 'urgent', 'todo'] → one EXISTS per tag
		expect(sql.match(/EXISTS/g)).toHaveLength(3);
	});

	it('populates tagState.relatedTags with the query result', async () => {
		const tags = [
			{ tag: 'urgent', color: null, display_name: null },
			{ tag: 'todo', color: null, display_name: null }
		];
		mockDB.select.mockResolvedValue(tags);
		await loadRelatedTags('work', []);
		expect(tagState.relatedTags).toEqual(tags);
	});
});
