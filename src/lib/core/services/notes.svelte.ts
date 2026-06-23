import { noteRepo } from '$lib/core/repositories/note.repo';
import { tagsService } from '$lib/core/services/tags.svelte';
import { eventBus } from '$lib/core/services/events/event-bus';
import {
	Note,
	newNoteContent as buildNewNoteContent,
	type NoteListItem
} from '$lib/core/domain/note';
import { UNTAGGED_FILTER } from '$lib/core/domain/tag';
import { toSqliteUtc, toLocalDayKeys, toLocalDayCounts } from '$lib/core/domain/shared/time';
import * as m from '$paraglide/messages.js';

// Convenience wrapper over the pure domain template, so callers (NotesPanel,
// shortcuts) keep the no-extra-argument `newNoteContent(activeTag)` call site at
// cutover while the domain function stays framework-free (title injected here).
export function newNoteContent(activeTag: string | null): string {
	return buildNewNoteContent(m.note_new_title(), activeTag);
}

/** Fields carried by a note imported from a file or peer during sync. */
export interface ImportOptions {
	pinned?: boolean;
	archived?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

// Application layer: orchestration and reactive state only. No SQL, no `getDb`,
// no derivation — the `Note` aggregate builds itself and `noteRepo` persists it.
// Each method is a thin ordered list of steps: build/edit a `Note`, call one repo
// method, update state, emit.
class NotesService {
	notes = $state<NoteListItem[]>([]);

	async load(tag?: string | null, composedTags: string[] = []): Promise<void> {
		if (tag === UNTAGGED_FILTER) {
			this.notes = await noteRepo.findUntagged();
			return;
		}
		this.notes = await noteRepo.findByTags(tag ? [tag, ...composedTags] : composedTags);
	}

	async create(content = ''): Promise<string> {
		const note = Note.create(content, tagsService.magicRules);
		await noteRepo.save(note);
		await tagsService.load();
		this.notes = [note.toListItem(), ...this.notes];
		eventBus.sync.localChange.emit();
		return note.id;
	}

	async update(id: string, content: string): Promise<void> {
		const meta = this.notes.find((n) => n.id === id) ?? (await noteRepo.findById(id));
		if (!meta) return;
		const note = Note.fromListItem(meta).withContent(content, tagsService.magicRules);
		await noteRepo.save(note);
		await tagsService.load();
		const item = note.toListItem();
		this.notes = this.notes.map((n) => (n.id === id ? item : n));
		eventBus.sync.localChange.emit();
	}

	async createForDate(id: string, content: string, localDate: Date): Promise<void> {
		const note = Note.create(content, tagsService.magicRules, {
			id,
			createdAt: createdAtForLocalDate(localDate)
		});
		await noteRepo.save(note);
		await tagsService.load();
		eventBus.sync.localChange.emit();
	}

	async loadContent(id: string): Promise<string> {
		return noteRepo.loadContent(id);
	}

	async delete(id: string): Promise<void> {
		await noteRepo.delete(id);
		this.notes = this.notes.filter((n) => n.id !== id);
		await tagsService.load();
		eventBus.notes.deleted.emit(id);
		eventBus.sync.localChange.emit();
	}

	/** Persist a note imported from a file during sync. No list or tag-state
	 *  refresh: the file is the source and the caller reloads tag state once for
	 *  the whole batch. */
	async importNote(id: string, content: string, opts: ImportOptions = {}): Promise<void> {
		const note = Note.create(content, tagsService.magicRules, {
			id,
			pinned: opts.pinned,
			archived: opts.archived,
			createdAt: opts.createdAt,
			updatedAt: opts.updatedAt
		});
		await noteRepo.importNote(note);
	}

	/** Set of local 'YYYY-MM-DD' days that have at least one note (by creation date). */
	async noteDates(): Promise<Set<string>> {
		return toLocalDayKeys(await noteRepo.createdDates());
	}

	/** Count of notes (any tag) per local 'YYYY-MM-DD' day, by creation date. */
	async noteCountsByDay(): Promise<Map<string, number>> {
		return toLocalDayCounts(await noteRepo.createdDates());
	}
}

export const notesService = new NotesService();

// `createForDate` stamps a journal note for the chosen day: noon for a past day
// (a stable, DST-safe midday), but "now" when the day is today so the entry keeps
// its real creation time. A thin use-case step; Concept 04 (Journal) may re-home it.
function createdAtForLocalDate(localDate: Date): string {
	const now = new Date();
	const isToday =
		now.getFullYear() === localDate.getFullYear() &&
		now.getMonth() === localDate.getMonth() &&
		now.getDate() === localDate.getDate();
	return isToday
		? toSqliteUtc(now)
		: toSqliteUtc(
				new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 12, 0, 0)
			);
}
