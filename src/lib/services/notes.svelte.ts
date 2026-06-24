import { noteRepo } from '$lib/repositories/note.repo';
import { tagsService } from '$lib/services/tags.svelte';
import { eventBus } from '$lib/services/events/event-bus';
import {
	Note,
	newNoteContent as buildNewNoteContent,
	type NoteListItem,
	type NoteSearchResult
} from '$lib/domain/note';
import { UNTAGGED_FILTER } from '$lib/domain/tag';
import { dayRange } from '$lib/domain/journal';
import { toLocalDayKeys, toLocalDayCounts } from '$lib/domain/shared/time';
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

	/** Create a note off the visible list, with a caller-chosen id and creation time.
	 *  The journal view stamps day entries through here (see `journalService`) and
	 *  keeps its own per-day buckets, so the shared `notes` list is left untouched. */
	async createDated(id: string, content: string, createdAt: string): Promise<void> {
		const note = Note.create(content, tagsService.magicRules, { id, createdAt });
		await noteRepo.save(note);
		await tagsService.load();
		eventBus.sync.localChange.emit();
	}

	async loadContent(id: string): Promise<string> {
		return noteRepo.loadContent(id);
	}

	/** Open the note's backing `.md` file in the OS default application. */
	async openOriginalFile(id: string): Promise<void> {
		await noteRepo.openOriginalFile(id);
	}

	/** Full-text + title search for the command palette. The length gating (FTS vs.
	 *  title LIKE vs. empty) lives in the repo, so callers just pass the raw query. */
	async search(query: string): Promise<NoteSearchResult[]> {
		return noteRepo.search(query);
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

	/** Load every note (any tag) created on the given local day into the visible
	 *  list — the main view's "active day" filter. This owns the shared list; the
	 *  journal view's per-date, journal-only reads go through `journalService`. */
	async loadForDay(localDate: Date): Promise<void> {
		const { utcFrom, utcTo } = dayRange(localDate);
		this.notes = await noteRepo.findByCreatedDate(utcFrom, utcTo);
	}
}

export const notesService = new NotesService();
