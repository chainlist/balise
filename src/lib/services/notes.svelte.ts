import { getDB } from '$lib/utils/db';
import { tagsService, UNTAGGED_FILTER } from '$lib/services/tags.svelte';
import { extractTitle } from '$lib/utils/note-title';
import { fsSyncService } from '$lib/services/fs-sync';
import {
	queryNotesByTags,
	queryUntaggedNotes,
	queryNoteById,
	insertNote,
	updateNoteContent,
	queryNoteUpdatedAt,
	deleteNoteById,
	queryJournalNotesByDate
} from '$lib/repositories/notes.repo';

import type { Note } from '$lib/repositories/notes.repo';
export type { Note };

export function newNoteContent(activeTag: string | null): string {
	return (
		'### New Note\n\n' +
		(activeTag && activeTag !== UNTAGGED_FILTER ? `#${activeTag}\n\n` : '')
	);
}

function toSQLiteUTC(d: Date): string {
	return d.toISOString().replace('T', ' ').slice(0, 19);
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
		await insertNote(db, id, content);
		const note = await queryNoteById(db, id);
		if (note) {
			this.notes = [note, ...this.notes];
			await fsSyncService.syncNoteFile(note);
		}
		return id;
	}

	async update(id: string, content: string): Promise<void> {
		const db = getDB();
		await updateNoteContent(db, id, content);
		await tagsService.syncNoteTags(id, content);
		const inList = this.notes.find((n) => n.id === id);
		if (inList) {
			inList.content = content;
			inList.title = extractTitle(content);
			const ts = await queryNoteUpdatedAt(db, id);
			if (ts) inList.updated_at = ts;
			await fsSyncService.syncNoteFile(inList);
		} else {
			const note = await queryNoteById(db, id);
			if (note) await fsSyncService.syncNoteFile(note);
		}
	}

	async queryForDate(localDate: Date): Promise<Note[]> {
		const y = localDate.getFullYear(), mo = localDate.getMonth(), d = localDate.getDate();
		const utcFrom = toSQLiteUTC(new Date(y, mo, d));
		const utcTo = toSQLiteUTC(new Date(y, mo, d + 1));
		return queryJournalNotesByDate(getDB(), utcFrom, utcTo);
	}

	async createForDate(id: string, content: string): Promise<void> {
		const db = getDB();
		await insertNote(db, id, content);
		await tagsService.syncNoteTags(id, content);
		const note = await queryNoteById(db, id);
		if (note) await fsSyncService.syncNoteFile(note);
	}

	async delete(id: string): Promise<void> {
		await deleteNoteById(getDB(), id);
		this.notes = this.notes.filter((n) => n.id !== id);
		await Promise.all([tagsService.load(), fsSyncService.deleteNoteFile(id)]);
	}
}

export const notesService = new NotesService();
