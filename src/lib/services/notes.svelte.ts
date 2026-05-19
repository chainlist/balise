import { getDB } from '$lib/utils/db';
import { syncNoteTags, loadTags } from '$lib/services/tags.svelte';
import {
	queryNotesByTags,
	queryUntaggedNotes,
	queryNoteById,
	insertNote,
	updateNoteContent,
	queryNoteUpdatedAt,
	deleteNoteById
} from '$lib/repositories/notes.repo';

export type { Note } from '$lib/repositories/notes.repo';
import type { Note } from '$lib/repositories/notes.repo';

export const UNTAGGED_FILTER = '__untagged__' as const;

export const noteState = $state({ notes: [] as Note[] });

export async function loadNotes(tag?: string | null, composedTags: string[] = []): Promise<void> {
	const db = getDB();

	if (tag === UNTAGGED_FILTER) {
		noteState.notes = await queryUntaggedNotes(db);
		return;
	}

	noteState.notes = await queryNotesByTags(db, tag ? [tag, ...composedTags] : composedTags);
}

export async function createNote(content = ''): Promise<string> {
	const db = getDB();
	const id = crypto.randomUUID();
	await insertNote(db, id, content);
	const note = await queryNoteById(db, id);
	if (note) noteState.notes = [note, ...noteState.notes];
	return id;
}

export async function updateNote(id: string, content: string): Promise<void> {
	const db = getDB();
	await updateNoteContent(db, id, content);
	await syncNoteTags(id, content);
	const note = noteState.notes.find((n) => n.id === id);
	if (note) {
		note.content = content;
		const ts = await queryNoteUpdatedAt(db, id);
		if (ts) note.updated_at = ts;
	}
}

export async function deleteNote(id: string): Promise<void> {
	await deleteNoteById(getDB(), id);
	noteState.notes = noteState.notes.filter((n) => n.id !== id);
	await loadTags();
}
