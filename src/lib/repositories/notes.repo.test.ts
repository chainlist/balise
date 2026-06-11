import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import {
	queryNotesByTags,
	queryUntaggedNotes,
	queryNoteById,
	insertNote,
	updateNote,
	queryNoteUpdatedAt,
	deleteNoteById
} from './notes.repo';

function makeDB() {
	return { select: vi.fn(), execute: vi.fn().mockResolvedValue(undefined) };
}

const NOTE = (id = '1') => ({
	id,
	content: '',
	pinned: 0,
	archived: 0,
	created_at: '',
	updated_at: ''
});

// ─── queryNotesByTags ─────────────────────────────────────────────────────────

describe('queryNotesByTags', () => {
	it('fetches all notes with no EXISTS clause when tags is empty', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([NOTE()]);
		await queryNotesByTags(db as never, []);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql).not.toContain('EXISTS');
		expect(sql).toContain('ORDER BY pinned DESC');
	});

	it('adds one EXISTS clause per tag', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryNotesByTags(db as never, ['work', 'urgent']);
		const [sql, params] = db.select.mock.calls[0] as [string, string[]];
		expect(sql.match(/EXISTS/g)).toHaveLength(2);
		expect(params).toEqual(['work', 'urgent']);
	});

	it('parameterises tags with LOWER() on both sides', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryNotesByTags(db as never, ['Work']);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql).toContain('LOWER(tag) = LOWER($1)');
	});

	it('returns the rows from the DB', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([NOTE('a'), NOTE('b')]);
		const result = await queryNotesByTags(db as never, []);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('a');
	});
});

// ─── queryUntaggedNotes ───────────────────────────────────────────────────────

describe('queryUntaggedNotes', () => {
	it('uses NOT IN clause', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		await queryUntaggedNotes(db as never);
		const [sql] = db.select.mock.calls[0] as [string];
		expect(sql).toContain('NOT EXISTS (SELECT 1 FROM note_tags WHERE note_id = notes.id)');
	});

	it('returns notes from the DB', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([NOTE('u1')]);
		const result = await queryUntaggedNotes(db as never);
		expect(result[0].id).toBe('u1');
	});
});

// ─── queryNoteById ────────────────────────────────────────────────────────────

describe('queryNoteById', () => {
	it('returns the first row when found', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([NOTE('42')]);
		const result = await queryNoteById(db as never, '42');
		expect(result?.id).toBe('42');
	});

	it('returns null when no row is found', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		const result = await queryNoteById(db as never, 'missing');
		expect(result).toBeNull();
	});

	it('passes the id as a parameter', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([NOTE('x')]);
		await queryNoteById(db as never, 'x');
		const [, params] = db.select.mock.calls[0] as [string, string[]];
		expect(params).toContain('x');
	});
});

// ─── insertNote ───────────────────────────────────────────────────────────────

describe('insertNote', () => {
	it('executes an INSERT INTO notes', async () => {
		const db = makeDB();
		await insertNote(db as never, { id: 'id-1', content: 'hello' });
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain('INSERT INTO notes');
	});

	it('passes the id and content as parameters', async () => {
		const db = makeDB();
		await insertNote(db as never, { id: 'id-1', content: 'hello' });
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('id-1');
		expect(params).toContain('hello');
	});

	it('includes createdAt in the INSERT when provided', async () => {
		const db = makeDB();
		await insertNote(db as never, { id: 'm1', content: 'hello', createdAt: '2025-01-01' });
		const [sql, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('created_at');
		expect(params).toContain('2025-01-01');
	});

	it('includes pinned, archived, createdAt and updatedAt when provided', async () => {
		const db = makeDB();
		await insertNote(db as never, {
			id: 'm1',
			content: 'hello',
			pinned: true,
			archived: false,
			createdAt: '2025-01-01',
			updatedAt: '2025-01-02'
		});
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('m1');
		expect(params).toContain(1); // pinned=true → 1
		expect(params).toContain(0); // archived=false → 0
		expect(params).toContain('2025-01-01');
		expect(params).toContain('2025-01-02');
	});
});

// ─── updateNote ───────────────────────────────────────────────────────────────

describe('updateNote', () => {
	it('executes an UPDATE notes SET content', async () => {
		const db = makeDB();
		await updateNote(db as never, '1', { content: 'new' });
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain('UPDATE notes SET content');
	});

	it('passes content first and id last as params', async () => {
		const db = makeDB();
		await updateNote(db as never, '1', { content: 'new content' });
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params[0]).toBe('new content');
		expect(params[params.length - 1]).toBe('1');
	});

	it('includes pinned and archived when provided', async () => {
		const db = makeDB();
		await updateNote(db as never, 's1', { content: 'synced', pinned: true, archived: true, createdAt: '2025-01-01' });
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params.filter((p) => p === 1)).toHaveLength(2); // pinned=1, archived=1
		expect(params).toContain('s1');
		expect(params).toContain('2025-01-01');
	});

	it("stamps updated_at with datetime('now') by default", async () => {
		const db = makeDB();
		await updateNote(db as never, '1', { content: 'new' });
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain("updated_at = datetime('now')");
	});

	it("uses the provided updatedAt instead of datetime('now')", async () => {
		const db = makeDB();
		await updateNote(db as never, 's1', { content: 'synced', updatedAt: '2025-01-02T03:04:05.000Z' });
		const [sql, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).not.toContain("datetime('now')");
		expect(params).toContain('2025-01-02T03:04:05.000Z');
		expect(params[params.length - 1]).toBe('s1'); // id stays last
	});
});

// ─── queryNoteUpdatedAt ───────────────────────────────────────────────────────

describe('queryNoteUpdatedAt', () => {
	it('returns the updated_at string', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([{ updated_at: '2025-05-18' }]);
		const result = await queryNoteUpdatedAt(db as never, '1');
		expect(result).toBe('2025-05-18');
	});

	it('returns null when the note is not found', async () => {
		const db = makeDB();
		db.select.mockResolvedValue([]);
		const result = await queryNoteUpdatedAt(db as never, 'missing');
		expect(result).toBeNull();
	});
});

// ─── deleteNoteById ───────────────────────────────────────────────────────────

describe('deleteNoteById', () => {
	it('executes a DELETE FROM notes', async () => {
		const db = makeDB();
		await deleteNoteById(db as never, '99');
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain('DELETE FROM notes');
	});

	it('passes the id as a parameter', async () => {
		const db = makeDB();
		await deleteNoteById(db as never, '99');
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('99');
	});
});

