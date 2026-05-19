import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/repositories/notes.repo', () => ({
	queryNotesByTags: vi.fn(),
	queryUntaggedNotes: vi.fn(),
	queryNoteById: vi.fn(),
	insertNote: vi.fn(),
	updateNoteContent: vi.fn(),
	queryNoteUpdatedAt: vi.fn(),
	deleteNoteById: vi.fn()
}));
vi.mock('$lib/utils/db', () => ({ getDB: vi.fn(() => ({})) }));
vi.mock('$lib/services/tags.svelte', () => ({
	syncNoteTags: vi.fn().mockResolvedValue(undefined),
	loadTags: vi.fn().mockResolvedValue(undefined)
}));

import { noteState, loadNotes, createNote, updateNote, deleteNote, UNTAGGED_FILTER } from './notes.svelte';
import * as repo from '$lib/repositories/notes.repo';
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
	it('calls queryUntaggedNotes for UNTAGGED_FILTER', async () => {
		vi.mocked(repo.queryUntaggedNotes).mockResolvedValue([NOTE()]);
		await loadNotes(UNTAGGED_FILTER);
		expect(repo.queryUntaggedNotes).toHaveBeenCalled();
		expect(repo.queryNotesByTags).not.toHaveBeenCalled();
	});

	it('calls queryNotesByTags with empty array when no tag provided', async () => {
		vi.mocked(repo.queryNotesByTags).mockResolvedValue([]);
		await loadNotes();
		expect(repo.queryNotesByTags).toHaveBeenCalledWith(expect.anything(), []);
	});

	it('calls queryNotesByTags with [tag] when only activeTag provided', async () => {
		vi.mocked(repo.queryNotesByTags).mockResolvedValue([]);
		await loadNotes('work');
		expect(repo.queryNotesByTags).toHaveBeenCalledWith(expect.anything(), ['work']);
	});

	it('calls queryNotesByTags with activeTag + composedTags merged', async () => {
		vi.mocked(repo.queryNotesByTags).mockResolvedValue([]);
		await loadNotes('work', ['urgent', 'todo']);
		expect(repo.queryNotesByTags).toHaveBeenCalledWith(expect.anything(), ['work', 'urgent', 'todo']);
	});

	it('sets noteState.notes to the returned rows', async () => {
		const notes = [NOTE('a'), NOTE('b')];
		vi.mocked(repo.queryNotesByTags).mockResolvedValue(notes);
		await loadNotes();
		expect(noteState.notes).toEqual(notes);
	});
});

// ─── createNote ───────────────────────────────────────────────────────────────

describe('createNote', () => {
	it('returns a UUID string', async () => {
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteById).mockResolvedValue(NOTE());
		const id = await createNote();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	});

	it('calls insertNote with the generated id and content', async () => {
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteById).mockResolvedValue(NOTE());
		await createNote('My content');
		expect(repo.insertNote).toHaveBeenCalledWith(
			expect.anything(),
			expect.any(String),
			'My content'
		);
	});

	it('prepends the new note to noteState.notes', async () => {
		noteState.notes = [NOTE('existing')];
		const created = NOTE('new');
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteById).mockResolvedValue(created);
		await createNote();
		expect(noteState.notes[0]).toEqual(created);
		expect(noteState.notes[1].id).toBe('existing');
	});
});

// ─── updateNote ───────────────────────────────────────────────────────────────

describe('updateNote', () => {
	it('calls updateNoteContent with the id and new content', async () => {
		noteState.notes = [NOTE('1')];
		vi.mocked(repo.updateNoteContent).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteUpdatedAt).mockResolvedValue('2025-05-18');
		await updateNote('1', 'new content');
		expect(repo.updateNoteContent).toHaveBeenCalledWith(expect.anything(), '1', 'new content');
	});

	it('calls syncNoteTags with id and new content', async () => {
		noteState.notes = [NOTE('1')];
		vi.mocked(repo.updateNoteContent).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteUpdatedAt).mockResolvedValue('2025-05-18');
		await updateNote('1', 'new content');
		expect(syncNoteTags).toHaveBeenCalledWith('1', 'new content');
	});

	it('updates the in-memory note content', async () => {
		noteState.notes = [NOTE('1')];
		vi.mocked(repo.updateNoteContent).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteUpdatedAt).mockResolvedValue('2025-05-18');
		await updateNote('1', 'updated');
		expect(noteState.notes[0].content).toBe('updated');
	});

	it('updates the in-memory updated_at timestamp', async () => {
		noteState.notes = [NOTE('1')];
		vi.mocked(repo.updateNoteContent).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteUpdatedAt).mockResolvedValue('2025-05-18T12:00:00');
		await updateNote('1', 'updated');
		expect(noteState.notes[0].updated_at).toBe('2025-05-18T12:00:00');
	});
});

// ─── deleteNote ───────────────────────────────────────────────────────────────

describe('deleteNote', () => {
	it('calls deleteNoteById with the id', async () => {
		vi.mocked(repo.deleteNoteById).mockResolvedValue(undefined);
		noteState.notes = [NOTE('99')];
		await deleteNote('99');
		expect(repo.deleteNoteById).toHaveBeenCalledWith(expect.anything(), '99');
	});

	it('removes the note from noteState.notes', async () => {
		vi.mocked(repo.deleteNoteById).mockResolvedValue(undefined);
		noteState.notes = [NOTE('1'), NOTE('2')];
		await deleteNote('1');
		expect(noteState.notes).toHaveLength(1);
		expect(noteState.notes[0].id).toBe('2');
	});

	it('calls loadTags after deletion', async () => {
		vi.mocked(repo.deleteNoteById).mockResolvedValue(undefined);
		noteState.notes = [NOTE('1')];
		await deleteNote('1');
		expect(loadTags).toHaveBeenCalled();
	});
});
