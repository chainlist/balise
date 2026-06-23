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
- [x] `dayRange(localDate): { utcFrom, utcTo }` (local midnight to next local midnight, as
      sqlite UTC). Reuse `shared/time`. Done: built via `toSqliteUtc`.
- [x] `createdAtForDate(localDate, now)`: today -> `now`; other day -> local noon. Pure.
      Done: `now` is a parameter so the rule is deterministic/testable (moved out of the
      pre-ported inline `createdAtForLocalDate` in `notes.svelte.ts`).
- [x] Re-export or reference the `journal` system tag from `domain/tag.ts`. Done:
      `export const JOURNAL_TAG = SYSTEM_TAGS.JOURNAL`.

### Application (`core/services/journal.svelte.ts`)
- [x] `journalNoteDates()` -> `toLocalDayKeys(noteRepo.journalCreatedDates())`. Done.
- [x] `queryForDate(localDate)` -> `noteRepo.findJournalByDate(dayRange(...))`. Done; returns
      `NoteListItem[]` (new repo shape).
- [x] `loadForDay(localDate)` -> sets `notesService.notes` (or its own `$state`) from
      `noteRepo.findByCreatedDate(dayRange(...))`. **Decision: kept on `notesService`, NOT on
      `journalService`.** Rationale: `loadForDay` loads *all* notes on a day (not journal-
      filtered) and mutates the shared visible list, so it belongs with the single owner of
      that list, alongside `noteDates`/`noteCountsByDay` (Concept 02). Its only caller is
      `ui-state` (the "active day" filter), which keeps calling `notesService` directly — a
      pure passthrough on `journalService` would be speculative indirection. `journalService`
      owns only the journal-tag-filtered reads + the dated create.
- [x] `createForDate(content, localDate)` -> `createdAtForDate` + `notesService` write path.
      Done as `createForDate(id, content, localDate)` (the `id` is kept so the journal view's
      optimistic draft keeps a stable identity). Routes the write through the new
      `notesService.createDated(id, content, createdAt)` (off the visible list) so note
      persistence keeps a single owner; the pre-ported `notes.svelte.ts:createForDate` and its
      inline date helper were removed.

### Tests (`core/domain/journal.test.ts`)
- [x] `dayRange`: a known local date yields the expected UTC bounds. Done (+ month-rollover).
- [x] `createdAtForDate`: today returns now; a past date returns local noon of that date.
      Done (+ future day also gets local noon). 5 tests pass.

## Definition of Done
- [x] Todos ticked; `pnpm exec vitest run src/lib/core/domain/journal.test.ts` passes (5/5).
- [x] `pnpm lint` passes (eslint clean on the 4 touched files; repo-wide lint is pre-existing
      dirty, so scoped per project note).
- [x] Self-audit: no `journal.repo.ts` created; date math is pure (`domain/journal.ts`);
      services have no SQL/`getDb`.
- [x] Dashboard updated.

## Notes
- The visible note list is shared with the main view. Keep a single owner of
  `notesService.notes` to avoid races; the journal view drives it through Notes use cases.
- `journalNotesByDate` uses `SYSTEM_TAGS.JOURNAL`; keep that constant in `domain/tag.ts`.
