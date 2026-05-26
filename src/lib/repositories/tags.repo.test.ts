import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import {
	queryTagsWithCounts,
	queryUntaggedCount,
	upsertTagSettings,
	resolveCanonicalTags,
	deleteNoteTags,
	insertNoteTags,
	queryRelatedTags
} from './tags.repo';

function makeDB() {
	return { select: vi.fn(), execute: vi.fn().mockResolvedValue(undefined) };
}

// ─── queryTagsWithCounts ──────────────────────────────────────────────────────

describe('queryTagsWithCounts', () => {
	it('joins tags, note_tags and tag_settings', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryTagsWithCounts(db as never);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql).toContain('LEFT JOIN note_tags');
		expect(sql).toContain('LEFT JOIN tag_settings');
		expect(sql).toContain('COALESCE(ts.pinned');
	});

	it('returns the raw rows', async () => {
		const db = makeDB();
		const rows = [{ tag: 'work', color: null, display_name: null, pinned: 0, count: 2 }];
		db.select.mockResolvedValue(rows);
		const result = await queryTagsWithCounts(db as never);
		expect(result).toEqual(rows);
	});
});

// ─── queryUntaggedCount ───────────────────────────────────────────────────────

describe('queryUntaggedCount', () => {
	it('returns a number, not a row object', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([{ count: 5 }]);
		const result = await queryUntaggedCount(db as never);
		expect(typeof result).toBe('number');
		expect(result).toBe(5);
	});

	it('returns 0 when the query returns no rows', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		const result = await queryUntaggedCount(db as never);
		expect(result).toBe(0);
	});
});

// ─── upsertTagSettings ────────────────────────────────────────────────────────

describe('upsertTagSettings', () => {
	it('uses INSERT ... ON CONFLICT DO UPDATE', async () => {
		const db = makeDB();
		await upsertTagSettings(db as never, 'work', { color: '#ff0000' });
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain('INSERT INTO tag_settings');
		expect(sql).toContain('ON CONFLICT(tag) DO UPDATE');
	});

	it('passes the tag as the first parameter', async () => {
		const db = makeDB();
		await upsertTagSettings(db as never, 'work', { color: '#ff0000' });
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params[0]).toBe('work');
	});

	it('converts pinned boolean true to 1', async () => {
		const db = makeDB();
		await upsertTagSettings(db as never, 'work', { pinned: true });
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain(1);
	});

	it('converts pinned boolean false to 0', async () => {
		const db = makeDB();
		await upsertTagSettings(db as never, 'work', { pinned: false });
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain(0);
	});

	it('passes null for pinned when not provided', async () => {
		const db = makeDB();
		await upsertTagSettings(db as never, 'work', { color: '#aaa' });
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		// 4th param is pinnedVal, should be null
		expect(params[3]).toBeNull();
	});
});

// ─── resolveCanonicalTags ─────────────────────────────────────────────────────

describe('resolveCanonicalTags', () => {
	it('uses a WITH ... VALUES clause for the raw names', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([{ canonical: 'work' }]);
		await resolveCanonicalTags(db as never, ['work']);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql).toContain('WITH raw(tag) AS');
		expect(sql).toContain('COALESCE');
	});

	it('returns an array of canonical strings', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([{ canonical: 'Work' }, { canonical: 'urgent' }]);
		const result = await resolveCanonicalTags(db as never, ['work', 'urgent']);
		expect(result).toEqual(['Work', 'urgent']);
	});

	it('passes the raw names as parameters', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([{ canonical: 'todo' }]);
		await resolveCanonicalTags(db as never, ['todo']);
		const [, params] = db.select.mock.calls[0] as [string, string[]];
		expect(params).toContain('todo');
	});
});

// ─── deleteNoteTags ───────────────────────────────────────────────────────────

describe('deleteNoteTags', () => {
	it('deletes from note_tags for the given note id', async () => {
		const db = makeDB();
		await deleteNoteTags(db as never, 'note-1');
		const [sql, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('DELETE FROM note_tags');
		expect(params).toContain('note-1');
	});
});

// ─── insertNoteTags ───────────────────────────────────────────────────────────

describe('insertNoteTags', () => {
	it('uses INSERT OR IGNORE INTO note_tags', async () => {
		const db = makeDB();
		await insertNoteTags(db as never, 'note-1', ['work']);
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain('INSERT OR IGNORE INTO note_tags');
	});

	it('includes the note id and all tag names in the parameters', async () => {
		const db = makeDB();
		await insertNoteTags(db as never, 'note-1', ['work', 'urgent']);
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('note-1');
		expect(params).toContain('work');
		expect(params).toContain('urgent');
	});

	it('generates one value tuple per tag', async () => {
		const db = makeDB();
		await insertNoteTags(db as never, 'note-1', ['a', 'b', 'c']);
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql.match(/\(\$1, \$\d+\)/g)).toHaveLength(3);
	});
});

// ─── queryRelatedTags ─────────────────────────────────────────────────────────

describe('queryRelatedTags', () => {
	it('uses a simple JOIN query when allCurrentTags is empty', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryRelatedTags(db as never, []);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql).toContain('FROM tags t');
		expect(sql).not.toContain('EXISTS');
	});

	it('uses exclude and EXISTS clauses when tags are provided', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryRelatedTags(db as never, ['work']);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql).toContain('LOWER(nt.tag) != LOWER($1)');
		expect(sql).toContain('EXISTS');
	});

	it('adds one EXISTS clause per current tag', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryRelatedTags(db as never, ['work', 'urgent']);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql.match(/EXISTS/g)).toHaveLength(2);
	});

	it('passes all current tags as parameters', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryRelatedTags(db as never, ['work', 'urgent']);
		const [, params] = db.select.mock.calls[0] as [string, string[]];
		expect(params).toEqual(['work', 'urgent']);
	});

	it('returns the related tag rows', async () => {
		const db = makeDB();
		const tags = [{ tag: 'todo', color: null, display_name: null }];
		db.select.mockResolvedValue(tags);
		const result = await queryRelatedTags(db as never, ['work']);
		expect(result).toEqual(tags);
	});
});
