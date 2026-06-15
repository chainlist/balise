import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/repositories/notes.repo', () => ({
	queryNotesByTags: vi.fn(),
	queryUntaggedNotes: vi.fn(),
	queryNoteById: vi.fn(),
	insertNote: vi.fn(),
	updateNote: vi.fn(),
	queryNoteUpdatedAt: vi.fn(),
	deleteNoteById: vi.fn(),
	insertDeletion: vi.fn()
}));
vi.mock('$lib/utils/db', () => ({ getDB: vi.fn(() => ({})) }));
vi.mock('$lib/repositories/tags.repo', () => ({
	setNoteTags: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/services/content/tags.svelte', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/services/content/tags.svelte')>();
	return {
		...actual,
		tagsService: {
			load: vi.fn().mockResolvedValue(undefined)
		}
	};
});

vi.mock('$lib/services/settings/settings.svelte', async () => {
	const { MAGIC_TAG_MATCH_TYPES } = await import('$lib/services/settings/magic-tags.svelte');
	return {
		MAGIC_TAG_MATCH_TYPES,
		settingsService: { magicTags: { state: { tags: [] } } }
	};
});

import { notesService } from './notes.svelte';
import { UNTAGGED_FILTER, tagsService } from '$lib/services/content/tags.svelte';
import * as repo from '$lib/repositories/notes.repo';
import { setNoteTags } from '$lib/repositories/tags.repo';

const NOTE = (id = '1') => ({
	id,
	title: 'Note title',
	content: 'hello',
	pinned: false,
	archived: false,
	created_at: '2025-01-01',
	updated_at: '2025-01-01'
});

beforeEach(() => {
	vi.clearAllMocks();
	notesService.notes = [];
});

// ─── load ─────────────────────────────────────────────────────────────────────

describe('load', () => {
	it('calls queryUntaggedNotes for UNTAGGED_FILTER', async () => {
		vi.mocked(repo.queryUntaggedNotes).mockResolvedValue([NOTE()]);
		await notesService.load(UNTAGGED_FILTER);
		expect(repo.queryUntaggedNotes).toHaveBeenCalled();
		expect(repo.queryNotesByTags).not.toHaveBeenCalled();
	});

	it('calls queryNotesByTags with empty array when no tag provided', async () => {
		vi.mocked(repo.queryNotesByTags).mockResolvedValue([]);
		await notesService.load();
		expect(repo.queryNotesByTags).toHaveBeenCalledWith(expect.anything(), []);
	});

	it('calls queryNotesByTags with [tag] when only activeTag provided', async () => {
		vi.mocked(repo.queryNotesByTags).mockResolvedValue([]);
		await notesService.load('work');
		expect(repo.queryNotesByTags).toHaveBeenCalledWith(expect.anything(), ['work']);
	});

	it('calls queryNotesByTags with activeTag + composedTags merged', async () => {
		vi.mocked(repo.queryNotesByTags).mockResolvedValue([]);
		await notesService.load('work', ['urgent', 'todo']);
		expect(repo.queryNotesByTags).toHaveBeenCalledWith(expect.anything(), [
			'work',
			'urgent',
			'todo'
		]);
	});

	it('sets notes to the returned rows', async () => {
		const notes = [NOTE('a'), NOTE('b')];
		vi.mocked(repo.queryNotesByTags).mockResolvedValue(notes);
		await notesService.load();
		expect(notesService.notes).toEqual(notes);
	});
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('create', () => {
	it('returns a UUID string', async () => {
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteById).mockResolvedValue(NOTE());
		const id = await notesService.create();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
	});

	it('calls insertNote with the generated id and content', async () => {
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteById).mockResolvedValue(NOTE());
		await notesService.create('My content');
		expect(repo.insertNote).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ content: 'My content', id: expect.any(String) })
		);
	});

	it('re-derives tags for the new note via setNoteTags', async () => {
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteById).mockResolvedValue(NOTE());
		await notesService.create('#work hello');
		expect(setNoteTags).toHaveBeenCalledWith(expect.anything(), expect.any(String), ['work']);
	});

	it('prepends the new note to notes', async () => {
		notesService.notes = [NOTE('existing')];
		const created = NOTE('new');
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteById).mockResolvedValue(created);
		await notesService.create();
		expect(notesService.notes[0]).toEqual(created);
		expect(notesService.notes[1].id).toBe('existing');
	});
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
	it('calls updateNote with the id and new content', async () => {
		notesService.notes = [NOTE('1')];
		vi.mocked(repo.updateNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteUpdatedAt).mockResolvedValue('2025-05-18');
		await notesService.update('1', 'new content');
		expect(repo.updateNote).toHaveBeenCalledWith(expect.anything(), '1', expect.objectContaining({ content: 'new content' }));
	});

	it('re-derives tags with id and new content via setNoteTags', async () => {
		notesService.notes = [NOTE('1')];
		vi.mocked(repo.updateNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteUpdatedAt).mockResolvedValue('2025-05-18');
		await notesService.update('1', 'new content');
		expect(setNoteTags).toHaveBeenCalledWith(expect.anything(), '1', []);
	});

	it('updates the in-memory updated_at timestamp', async () => {
		notesService.notes = [NOTE('1')];
		vi.mocked(repo.updateNote).mockResolvedValue(undefined);
		vi.mocked(repo.queryNoteUpdatedAt).mockResolvedValue('2025-05-18T12:00:00');
		await notesService.update('1', 'updated');
		expect(notesService.notes[0].updated_at).toBe('2025-05-18T12:00:00');
	});
});

// ─── delete ───────────────────────────────────────────────────────────────────

describe('delete', () => {
	it('calls deleteNoteById with the id', async () => {
		vi.mocked(repo.deleteNoteById).mockResolvedValue(undefined);
		notesService.notes = [NOTE('99')];
		await notesService.delete('99');
		expect(repo.deleteNoteById).toHaveBeenCalledWith(expect.anything(), '99');
	});

	it('removes the note from notes', async () => {
		vi.mocked(repo.deleteNoteById).mockResolvedValue(undefined);
		notesService.notes = [NOTE('1'), NOTE('2')];
		await notesService.delete('1');
		expect(notesService.notes).toHaveLength(1);
		expect(notesService.notes[0].id).toBe('2');
	});

	it('calls tagsService.load after deletion', async () => {
		vi.mocked(repo.deleteNoteById).mockResolvedValue(undefined);
		notesService.notes = [NOTE('1')];
		await notesService.delete('1');
		expect(tagsService.load).toHaveBeenCalled();
	});
});

// ─── importNote ───────────────────────────────────────────────────────────────

describe('importNote', () => {
	it('writes content and re-derives tags via setNoteTags', async () => {
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		await notesService.importNote('f1', '#work hello', { create: true });
		expect(repo.insertNote).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: 'f1', content: '#work hello' })
		);
		expect(setNoteTags).toHaveBeenCalledWith(expect.anything(), 'f1', ['work']);
	});

	it('does not reload tag state or touch the notes list', async () => {
		vi.mocked(repo.insertNote).mockResolvedValue(undefined);
		notesService.notes = [NOTE('existing')];
		await notesService.importNote('f1', 'plain', { create: true });
		expect(tagsService.load).not.toHaveBeenCalled();
		expect(notesService.notes).toHaveLength(1);
		expect(notesService.notes[0].id).toBe('existing');
	});
});
