import { getDB } from '$lib/utils/db';
import { tagsService, extractTags, UNTAGGED_FILTER } from '$lib/services/content/tags.svelte';
import { noteSignals } from '$lib/services/content/note-signals';
import { extractTitle, notePreview } from '$lib/utils/note-utils';
import { toSqliteUtc } from '$lib/utils/time';
import { writeNoteFile, deleteNoteFile } from '$lib/repositories/notes.fs.repo';
import { setNoteTags } from '$lib/repositories/tags.repo';
import {
	queryNotesByTags,
	queryUntaggedNotes,
	queryNoteById,
	queryNoteContent,
	queryNoteUpdatedAt,
	deleteNoteById,
	insertDeletion,
	queryJournalNotesByDate,
	insertNote,
	updateNote
} from '$lib/repositories/notes.repo';

import * as m from '$paraglide/messages.js';
import type { Note } from '$lib/models/note';
export type { Note } from '$lib/models/note';

export function newNoteContent(activeTag: string | null): string {
	return (
		`### ${m.note_new_title()}\n\n` +
		(activeTag && activeTag !== UNTAGGED_FILTER ? `#${activeTag}\n\n` : '')
	);
}

interface WriteOptions {
	create: boolean;
	pinned?: boolean;
	archived?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

class NotesService {
	notes = $state<Note[]>([]);

	/**
	 * The single kernel that pairs a note content write with tag (re-)derivation,
	 * so the `note_tags` invariant cannot be forgotten. Does NOT refresh the tag
	 * list, mutate `notes`, or mirror to disk - callers layer those on top.
	 */
	async #write(id: string, content: string, opts: WriteOptions): Promise<void> {
		const db = getDB();
		if (opts.create) {
			await insertNote(db, {
				id,
				content,
				createdAt: opts.createdAt,
				updatedAt: opts.updatedAt,
				pinned: opts.pinned,
				archived: opts.archived
			});
		} else {
			await updateNote(db, id, {
				content,
				pinned: opts.pinned,
				archived: opts.archived,
				createdAt: opts.createdAt,
				updatedAt: opts.updatedAt
			});
		}
		await setNoteTags(db, id, extractTags(content));
	}

	/**
	 * Persist a note imported from a file during sync. Kernel write only: the
	 * file is the source (no mirror back), `notes` isn't loaded yet, and the
	 * caller reloads tag state once for the whole batch.
	 */
	async importNote(id: string, content: string, opts: WriteOptions): Promise<void> {
		await this.#write(id, content, opts);
	}

	async load(tag?: string | null, composedTags: string[] = []): Promise<void> {
		const db = getDB();

		if (tag === UNTAGGED_FILTER) {
			this.notes = await queryUntaggedNotes(db);
			return;
		}

		this.notes = await queryNotesByTags(db, tag ? [tag, ...composedTags] : composedTags);
	}

	async create(content = ''): Promise<string> {
		const id = crypto.randomUUID();
		await this.#write(id, content, { create: true });
		await tagsService.load();
		const note = await queryNoteById(getDB(), id);
		if (note) {
			this.notes = [note, ...this.notes];
			await writeNoteFile({ ...note, content });
		}
		noteSignals.signalLocalChange();
		return id;
	}

	async update(id: string, content: string): Promise<void> {
		const db = getDB();
		await this.#write(id, content, { create: false });
		await tagsService.load();
		const inList = this.notes.find((n) => n.id === id);
		if (inList) {
			inList.title = extractTitle(content);
			inList.preview = notePreview(content);
			const ts = await queryNoteUpdatedAt(db, id);
			if (ts) inList.updated_at = ts;
			await writeNoteFile({ ...inList, content });
		} else {
			const note = await queryNoteById(db, id);
			if (note) await writeNoteFile({ ...note, content });
		}
		noteSignals.signalLocalChange();
	}

	async queryForDate(localDate: Date): Promise<Note[]> {
		const y = localDate.getFullYear(), mo = localDate.getMonth(), d = localDate.getDate();
		const utcFrom = toSqliteUtc(new Date(y, mo, d));
		const utcTo = toSqliteUtc(new Date(y, mo, d + 1));
		return queryJournalNotesByDate(getDB(), utcFrom, utcTo);
	}

	async createForDate(id: string, content: string, localDate: Date): Promise<void> {
		const db = getDB();
		const now = new Date();
		const isToday = now.getFullYear() === localDate.getFullYear()
			&& now.getMonth() === localDate.getMonth()
			&& now.getDate() === localDate.getDate();
		const createdAt = isToday
			? toSqliteUtc(now)
			: toSqliteUtc(new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12, 0, 0));
		await this.#write(id, content, { create: true, createdAt });
		await tagsService.load();
		const note = await queryNoteById(db, id);
		if (note) await writeNoteFile({ ...note, content });
		noteSignals.signalLocalChange();
	}

	async loadContent(id: string): Promise<string> {
		return queryNoteContent(getDB(), id);
	}

	async delete(id: string): Promise<void> {
		const db = getDB();
		// Tombstone before the hard delete so the deletion can propagate to paired
		// devices; otherwise sync would see the note "missing" and resurrect it.
		await insertDeletion(db, id);
		await deleteNoteById(db, id);
		this.notes = this.notes.filter((n) => n.id !== id);
		await Promise.all([tagsService.load(), deleteNoteFile(id)]);
		noteSignals.signalLocalChange();
	}
}

export const notesService = new NotesService();
