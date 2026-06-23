# Concept 05: Tasks

**Goal:** rebuild the task board as a view over notes. Tasks are derived by parsing note
content (hashtag tasks `#todo/#inprogress/#done` and checklist items), grouped by status.
Moving a task rewrites the source line in the note. Parsing and line-rewrite rules are
domain; the board orchestration is application.

**Depends on:** 02 (Notes domain, note.repo, notesService), 00.

## What "tasks" covers

- Parse tasks out of note content (`parseTasksFromNote`), two sources: `hashtag` and
  `checklist`.
- Load active tasks (todo, inprogress) and recent done tasks from notes tagged accordingly.
- Move a task to a new status by rewriting its source line, then persisting via the Notes
  write path (which re-derives tags and mirrors to disk).
- Task colors for the board.

## Old to new mapping

| Old | New layer | New file |
| --- | --- | --- |
| `utils/task-parser.ts` (`parseTasksFromNote`, `HASHTAG_RE`, `CHECKLIST_RE`, `TaskItem`, `TaskStatus`) | Domain | `core/domain/task.ts` |
| `tasks.svelte.ts`: `rewriteHashtagLine`, `rewriteChecklistLine` | Domain | `core/domain/task.ts` |
| `utils/task-colors.ts` | Domain | `core/domain/task.ts` (or `domain/shared` if shared) |
| `notes.repo.ts`: `queryActiveTaskNotes`, `queryRecentDoneNotes` | Data Access | `core/repositories/note.repo.ts` (note queries) |
| `tasks.svelte.ts` class (`tasks` state, `load`, `moveTask`) | Application | `core/services/tasks.svelte.ts` |

## Todos

### Domain (`core/domain/task.ts`)
- [ ] Move `parseTasksFromNote(noteId, title, content)` and the regexes; types `TaskItem`,
      `TaskStatus`. Pure.
- [ ] Move `rewriteHashtagLine(line, status)` and `rewriteChecklistLine(line, status)`.
      Pure: given a line and target status, return the new line. Include the rule that a
      checklist task cannot move to `inprogress`.
- [ ] Move task color mapping.

### Data Access (`core/repositories/note.repo.ts`)
- [ ] Add `queryActiveTaskNotes` and `queryRecentDoneNotes` (system tags TODO, INPROGRESS,
      DONE; DONE limited). `getDb()` internal.

### Application (`core/services/tasks.svelte.ts`)
- [ ] `$state tasks`. `load()`: read active + done task notes, parse each via domain,
      dedupe by note id, flatten.
- [ ] `moveTask(task, newStatus)`: re-read content via `notesService.loadContent`, guard
      against a stale line (reload if the line moved), compute the new line via domain,
      persist via `notesService.update`, update local state.

### Tests (`core/domain/task.test.ts`)
- [ ] Port and extend `utils/task-parser.test.ts`: hashtag and checklist parsing, line
      indices, status detection.
- [ ] `rewriteHashtagLine`/`rewriteChecklistLine`: each status transition; the
      checklist-to-inprogress no-op rule.

## Definition of Done
- [ ] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/task.test.ts` passes.
- [ ] `pnpm lint` passes.
- [ ] Self-audit: parsing/rewrite are pure; the service goes through `notesService`, not the
      repo, for writes (so the tag and file invariants hold).
- [ ] Dashboard updated.

## Notes
- `moveTask` must write through `notesService.update` (not `note.repo` directly) so tag
  re-derivation and file mirroring still happen. This is the reason Tasks depends on Notes.
