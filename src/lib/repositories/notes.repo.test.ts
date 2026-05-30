import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

import {
	queryNotesByTags,
	queryUntaggedNotes,
	queryNoteById,
	insertNote,
	updateNoteContent,
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
		expect(sql).toContain('NOT IN (SELECT DISTINCT note_id FROM note_tags)');
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
		await insertNote(db as never, 'id-1', 'hello');
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain('INSERT INTO notes');
	});

	it('passes the id and content as parameters', async () => {
		const db = makeDB();
		await insertNote(db as never, 'id-1', 'hello');
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('id-1');
		expect(params).toContain('hello');
	});
});

// ─── updateNoteContent ────────────────────────────────────────────────────────

describe('updateNoteContent', () => {
	it('executes an UPDATE notes SET content', async () => {
		const db = makeDB();
		await updateNoteContent(db as never, '1', 'new');
		const [sql] = db.execute.mock.calls[0] as [string];
		expect(sql).toContain('UPDATE notes SET content');
	});

	it('passes content, title, preview, then id as params', async () => {
		const db = makeDB();
		await updateNoteContent(db as never, '1', 'new content');
		const [, params] = db.execute.mock.calls[0] as [string, unknown[]];
		expect(params[0]).toBe('new content');
		expect(params[3]).toBe('1');
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
