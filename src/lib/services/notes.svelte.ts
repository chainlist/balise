import { getDB } from '$lib/utils/db';
import { tagsService } from '$lib/services/tags.svelte';
import { extractTitle } from '$lib/utils/note-title';
import {
	queryNotesByTags,
	queryUntaggedNotes,
	queryNoteById,
	insertNote,
	updateNoteContent,
	queryNoteUpdatedAt,
	deleteNoteById
} from '$lib/repositories/notes.repo';

import type { Note } from '$lib/repositories/notes.repo';
export type { Note };

export const UNTAGGED_FILTER = '__untagged__' as const;

export function newNoteContent(activeTag: string | null): string {
	return (
		'### New Note\n\n' +
		(activeTag && activeTag !== UNTAGGED_FILTER ? `#${activeTag}\n\n` : '')
	);
}

class NotesService {
	notes = $state<Note[]>([]);

	async load(tag?: string | null, composedTags: string[] = []): Promise<void> {
		const db = getDB();

		if (tag === UNTAGGED_FILTER) {
			this.notes = await queryUntaggedNotes(db);
			return;
		}

		this.notes = await queryNotesByTags(db, tag ? [tag, ...composedTags] : composedTags);
	}

	async create(content = ''): Promise<string> {
		const db = getDB();
		const id = crypto.randomUUID();
		await insertNote(db, id, content, extractTitle(content));
		const note = await queryNoteById(db, id);
		if (note) this.notes = [note, ...this.notes];
		return id;
	}

	async update(id: string, content: string): Promise<void> {
		const db = getDB();
		await updateNoteContent(db, id, content, extractTitle(content));
		await tagsService.syncNoteTags(id, content);
		const note = this.notes.find((n) => n.id === id);
		if (note) {
			note.content = content;
			note.title = extractTitle(content);
			const ts = await queryNoteUpdatedAt(db, id);
			if (ts) note.updated_at = ts;
		}
	}

	async delete(id: string): Promise<void> {
		await deleteNoteById(getDB(), id);
		this.notes = this.notes.filter((n) => n.id !== id);
		await tagsService.load();
	}
}

export const notesService = new NotesService();
