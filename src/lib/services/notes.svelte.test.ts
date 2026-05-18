import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDB = vi.hoisted(() => ({ select: vi.fn(), execute: vi.fn() }));

vi.mock('$lib/utils/db', () => ({ getDB: () => mockDB }));
vi.mock('$lib/services/tags.svelte', () => ({
	syncNoteTags: vi.fn().mockResolvedValue(undefined),
	loadTags: vi.fn().mockResolvedValue(undefined)
}));

import { noteState, loadNotes, createNote, updateNote, deleteNote, UNTAGGED_FILTER } from './notes.svelte';
import { syncNoteTags, loadTags } from '$lib/services/tags.svelte';

const NOTE = (id = '1') => ({
	id,
	content: 'hello',
	pinned: 0,
	archived: 0,
	created_at: '2025-01-01',
	updated_at: '2025-01-01'
});

beforeEach(() => {
	vi.clearAllMocks();
	noteState.notes = [];
});

// ─── loadNotes ────────────────────────────────────────────────────────────────

describe('loadNotes', () => {
	it('loads all notes when called with no arguments', async () => {
		const notes = [NOTE()];
		mockDB.select.mockResolvedValue(notes);
		await loadNotes();
		expect(noteState.notes).toEqual(notes);
	});

	it('uses the untagged WHERE clause for UNTAGGED_FILTER', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadNotes(UNTAGGED_FILTER);
		const [sql] = mockDB.select.mock.calls[0] as [string];
		expect(sql).toContain('NOT IN (SELECT DISTINCT note_id FROM note_tags)');
	});

	it('adds a parameterised EXISTS clause for a single tag', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadNotes('work');
		const [sql, params] = mockDB.select.mock.calls[0] as [string, string[]];
		expect(sql).toContain('EXISTS');
		expect(params).toEqual(['work']);
	});

	it('adds one EXISTS clause per tag when composed tags are provided', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadNotes('work', ['urgent', 'todo']);
		const [sql, params] = mockDB.select.mock.calls[0] as [string, string[]];
		expect(sql.match(/EXISTS/g)).toHaveLength(3);
		expect(params).toEqual(['work', 'urgent', 'todo']);
	});

	it('filters with only composed tags when activeTag is null', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadNotes(null, ['urgent']);
		const [, params] = mockDB.select.mock.calls[0] as [string, string[]];
		expect(params).toEqual(['urgent']);
	});

	it('loads all notes when both tag and composedTags are empty', async () => {
		mockDB.select.mockResolvedValue([]);
		await loadNotes(null, []);
		const [sql] = mockDB.select.mock.calls[0] as [string];
		expect(sql).not.toContain('EXISTS');
	});
});

// ─── createNote ───────────────────────────────────────────────────────────────

describe('createNote', () => {
	it('returns a UUID string', async () => {
		const note = NOTE('new-uuid');
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([note]);
		const id = await createNote();
		// UUID v4 pattern
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	});

	it('prepends the new note to noteState.notes', async () => {
		const existing = NOTE('existing');
		noteState.notes = [existing];
		const created = NOTE('created');
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([created]);
		await createNote();
		expect(noteState.notes[0]).toEqual(created);
		expect(noteState.notes[1]).toEqual(existing);
	});

	it('inserts with the provided content', async () => {
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([NOTE()]);
		await createNote('My content');
		const [sql, params] = mockDB.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('INSERT INTO notes');
		expect(params).toContain('My content');
	});

	it('inserts with empty content by default', async () => {
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([NOTE()]);
		await createNote();
		const [, params] = mockDB.execute.mock.calls[0] as [string, unknown[]];
		expect(params).toContain('');
	});
});

// ─── updateNote ───────────────────────────────────────────────────────────────

describe('updateNote', () => {
	it('calls syncNoteTags with the note id and new content', async () => {
		noteState.notes = [NOTE('1')];
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([{ updated_at: '2025-05-18' }]);
		await updateNote('1', 'new content');
		expect(syncNoteTags).toHaveBeenCalledWith('1', 'new content');
	});

	it('updates the in-memory note content', async () => {
		noteState.notes = [NOTE('1')];
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([{ updated_at: '2025-05-18' }]);
		await updateNote('1', 'updated');
		expect(noteState.notes[0].content).toBe('updated');
	});

	it('updates the in-memory updated_at timestamp', async () => {
		noteState.notes = [NOTE('1')];
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([{ updated_at: '2025-05-18T12:00:00' }]);
		await updateNote('1', 'updated');
		expect(noteState.notes[0].updated_at).toBe('2025-05-18T12:00:00');
	});

	it('issues an UPDATE SQL for the correct note id', async () => {
		noteState.notes = [NOTE('42')];
		mockDB.execute.mockResolvedValue(undefined);
		mockDB.select.mockResolvedValue([{ updated_at: '' }]);
		await updateNote('42', 'text');
		const [sql, params] = mockDB.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('UPDATE notes');
		expect(params).toContain('42');
	});
});

// ─── deleteNote ───────────────────────────────────────────────────────────────

describe('deleteNote', () => {
	it('removes the note from noteState.notes', async () => {
		noteState.notes = [NOTE('1'), NOTE('2')];
		mockDB.execute.mockResolvedValue(undefined);
		await deleteNote('1');
		expect(noteState.notes).toHaveLength(1);
		expect(noteState.notes[0].id).toBe('2');
	});

	it('calls loadTags after deletion', async () => {
		noteState.notes = [NOTE('1')];
		mockDB.execute.mockResolvedValue(undefined);
		await deleteNote('1');
		expect(loadTags).toHaveBeenCalled();
	});

	it('issues a DELETE SQL with the note id', async () => {
		noteState.notes = [NOTE('99')];
		mockDB.execute.mockResolvedValue(undefined);
		await deleteNote('99');
		const [sql, params] = mockDB.execute.mock.calls[0] as [string, unknown[]];
		expect(sql).toContain('DELETE FROM notes');
		expect(params).toContain('99');
	});

	it('leaves other notes intact', async () => {
		noteState.notes = [NOTE('1'), NOTE('2'), NOTE('3')];
		mockDB.execute.mockResolvedValue(undefined);
		await deleteNote('2');
		expect(noteState.notes.map((n) => n.id)).toEqual(['1', '3']);
	});
});
