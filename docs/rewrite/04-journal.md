# Concept 04: Journal

**Goal:** rebuild the journal as a thin view concept over Notes. The journal is the set of
notes carrying the system `journal` tag, browsed by date. There is little new persistence:
the date and day logic is domain, the queries are note queries, and a small `journalService`
orchestrates the date-filtered views.

**Depends on:** 02 (Notes domain, note.repo, notesService), 00 (time).

## What "journal" covers

- A calendar view: which local days have notes / have journal notes.
- Loading notes created on a given local day (`loadForDay`).
- Loading the journal notes for a date (`queryForDate`).
- Creating a note for a specific date (`createForDate`), including the noon-stamp rule for
  non-today dates.

## Old to new mapping

| Old | New layer | New file |
| --- | --- | --- |
| `notes.svelte.ts`: `journalNoteDates`, `queryForDate`, `loadForDay`, `createForDate` (the day-range math) | Domain + Application | day-range math in `core/domain/journal.ts`; orchestration in `core/services/journal.svelte.ts` |
| `notes.repo.ts`: `queryJournalNotesByDate`, `queryNotesByCreatedDate`, `queryJournalNoteCreatedDates` | Data Access | stay in `core/repositories/note.repo.ts` (they are note queries) |
| `settings/journal.svelte.ts` | Application (Settings) | handled in Concept 07, not here |

## Key design decision
The journal is a **view**, not a new table. Do not create a `journal.repo.ts`. The date
range computation (`localDate -> [utcFrom, utcTo)`) is pure and belongs in
`core/domain/journal.ts`. The note queries already exist in `note.repo.ts`. The
`journalService` ties them together and exposes the calendar-marking sets.

## Todos

### Domain (`core/domain/journal.ts`)
- [ ] `dayRange(localDate): { utcFrom, utcTo }` (local midnight to next local midnight, as
      sqlite UTC). Reuse `shared/time`.
- [ ] `createdAtForDate(localDate, now)`: today -> `now`; other day -> local noon. Pure.
- [ ] Re-export or reference the `journal` system tag from `domain/tag.ts`.

### Application (`core/services/journal.svelte.ts`)
- [ ] `journalNoteDates()` -> `toLocalDayKeys(noteRepo.queryJournalNoteCreatedDates())`.
- [ ] `queryForDate(localDate)` -> `noteRepo.queryJournalNotesByDate(dayRange(...))`.
- [ ] `loadForDay(localDate)` -> sets `notesService.notes` (or its own `$state`) from
      `noteRepo.queryNotesByCreatedDate(dayRange(...))`. Decide: keep `loadForDay` on
      `notesService` (it mutates the shared list) and have journal call it, to avoid two
      owners of the visible list. Record the choice.
- [ ] `createForDate(content, localDate)` -> `createdAtForDate` + `notesService` write path.

### Tests (`core/domain/journal.test.ts`)
- [ ] `dayRange`: a known local date yields the expected UTC bounds.
- [ ] `createdAtForDate`: today returns now; a past date returns local noon of that date.

## Definition of Done
- [ ] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/journal.test.ts` passes.
- [ ] `pnpm lint` passes.
- [ ] Self-audit: no `journal.repo.ts` created; date math is pure; service has no SQL.
- [ ] Dashboard updated.

## Notes
- The visible note list is shared with the main view. Keep a single owner of
  `notesService.notes` to avoid races; the journal view drives it through Notes use cases.
- `journalNotesByDate` uses `SYSTEM_TAGS.JOURNAL`; keep that constant in `domain/tag.ts`.
