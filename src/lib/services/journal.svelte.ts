import { noteRepo } from '$lib/repositories/note.repo';
import { notesService } from '$lib/services/notes.svelte';
import { dayRange, createdAtForDate } from '$lib/domain/journal';
import { toLocalDayKeys } from '$lib/domain/shared/time';
import type { NoteListItem } from '$lib/domain/note';

// Application layer: the journal is a thin view over Notes (the notes carrying the
// system `journal` tag, browsed by date), so this service owns no table and no
// state — it ties the pure day-range / stamp rules in `domain/journal` to the note
// queries already in `note.repo`. The reads return data the journal view holds
// locally (calendar marks, a day's entries); the one write delegates to
// `notesService` so note persistence keeps a single owner. The main view's "active
// day" list filter (over *all* notes) stays on `notesService.loadForDay`, which
// owns the shared visible list.
class JournalService {
	/** Local 'YYYY-MM-DD' days that have at least one journal note, for calendar marking. */
	async journalNoteDates(): Promise<Set<string>> {
		return toLocalDayKeys(await noteRepo.journalCreatedDates());
	}

	/** Journal notes created on the given local day, oldest first. */
	async queryForDate(localDate: Date): Promise<NoteListItem[]> {
		const { utcFrom, utcTo } = dayRange(localDate);
		return noteRepo.findJournalByDate(utcFrom, utcTo);
	}

	/** Create a journal entry stamped to `localDate`: today keeps "now", any other
	 *  day gets local noon. The write is routed through `notesService` (off the
	 *  visible list) so the create / tag-reload / sync sequence lives in one place. */
	async createForDate(id: string, content: string, localDate: Date): Promise<void> {
		await notesService.createDated(id, content, createdAtForDate(localDate, new Date()));
	}
}

export const journalService = new JournalService();
