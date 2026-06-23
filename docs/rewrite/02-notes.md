# Concept 02: Notes

**Goal:** rebuild the core note concept across all lower layers, in the exact shape of the
reference example: a behavior-rich `Note` aggregate that builds and validates itself, a thin
`notesService` that sequences use cases, and a `noteRepo` that speaks `Note` objects and
hides the persistence. The big fixes: derivation (title, preview, tags) moves into the
domain aggregate, and all SQL leaves the service for the repo.

**Depends on:** 00 (shared markdown, time, backend client), 01 (tag extraction).

## Old to new mapping

| Old | New layer | New file |
| --- | --- | --- |
| `models/note.ts` (`Note`, `NoteSearchResult`) | Domain | `core/domain/note.ts` (`Note` class + `NoteListItem`, `NoteSearchResult` types) |
| `notes.svelte.ts`: `newNoteContent`; `notes.fs.repo.ts`: `toFrontmatter` | Domain | methods/functions on `core/domain/note.ts` (`Note.buildFile`, `Note.fromFile`, `newNoteContent`) |
| `repositories/notes.repo.ts` + `notes.fs.repo.ts` IO | Data Access | `core/repositories/note.repo.ts` (`noteRepo`, DB and file IO together) |
| `notes.svelte.ts` class | Application | `core/services/notes.svelte.ts` (thin `notesService`) |

## Key decisions

1. **`Note` is an aggregate, not a record.** A `static create(content, magicRules)` factory
   validates and derives `tags`, `title`, and `preview`, then returns a `Note`. Reconstitute
   from storage with `Note.fromRow(row)` and from a file with `Note.fromFile(text)`. An edit
   is `note.withContent(content, magicRules)` (re-derives and bumps `updatedAt`). The
   frontmatter shape is `note.buildFile()`. The domain is pure: `magicRules` are passed in
   (the Concept 01 seam), no I/O, no Svelte, no Tauri.
   Apply Balise's real rules in `create`, not the example's: today empty content is allowed
   (the editor seeds a template), so do **not** copy the example's not-empty throw blindly.
2. **A `NoteListItem` projection backs the list.** The visible list uses lightweight rows
   (id, title, preview, flags, dates) without `content`, for the virtual-scroll perf the app
   relies on. `noteRepo.findByTags(...)` returns `NoteListItem[]`; the full `Note` aggregate
   (with content) is loaded only when a note is opened or written. This is the one refinement
   over the single-shape example; record it.
3. **`noteRepo` speaks `Note` and owns DB plus file IO.** `noteRepo.save(note)` writes the
   columns, rewrites `note_tags` from `note.tags`, writes the `.md` file from
   `note.buildFile()`, and aligns mtime, all internally. `noteRepo.delete(id)` writes the
   tombstone, deletes the row, and deletes the file. This is one use-case method per write
   (README rule 4): the deferred Rust plan swaps each body for one `invoke` with no change
   above the repo. No derivation, no `extractTitle`/`extractTags` import in the repo.
4. **The service is a thin sequencer.** `notesService.create(content)` is `Note.create(...)`
   then `noteRepo.save(note)` then update `$state` then emit. No SQL, no `getDb`, no rules.

## Worked example (the target shape, createNote top to bottom)

```ts
// DOMAIN  core/domain/note.ts  (pure: rules in, no I/O)
export class Note {
  private constructor(
    readonly id, public content, public title, public preview,
    public tags, public pinned, public archived, public createdAt, public updatedAt,
  ) {}
  static create(content, magicRules) {
    const now = toSqliteUtc(new Date());
    return new Note(newId(), content, extractTitle(content), notePreview(content),
      extractTags(content, magicRules), false, false, now, now);
  }
  withContent(content, magicRules) { /* re-derive title/preview/tags, bump updatedAt */ }
  buildFile() { /* frontmatter + body */ }
  static fromFile(text) { /* parse frontmatter + body -> Note */ }
  static fromRow(row) { /* DB row -> Note */ }
}
```
```ts
// APPLICATION  core/services/notes.svelte.ts  (thin steps, holds $state)
async create(content = newNoteContent(m.note_new_title(), uiState.activeTag)) {
  const note = Note.create(content, tagsService.magicRules); // domain builds + validates
  await noteRepo.save(note);                                 // data layer persists
  this.notes = [note.toListItem(), ...this.notes];           // update reactive state
  eventBus.sync.localChange.emit();
  return note;
}
```
```ts
// DATA ACCESS  core/repositories/note.repo.ts  (speaks Note, SQL lives only here)
export const noteRepo = {
  async save(note) {
    const db = getDb();                       // connection owned behind this layer
    await db.execute('INSERT OR REPLACE INTO notes (...) VALUES (...)', note.toRow());
    await setNoteTags(db, note.id, note.tags);
    await this.writeFile(note);               // .md mirror + mtime, internal
  },
  findByTags: (tags) => /* -> NoteListItem[] */,
  // deferred Rust swap: save: (note) => invoke('save_note', { note })
};
```

## Todos

### Domain (`core/domain/note.ts`)
- [x] `Note` class with fields and `static create(content, magicRules)` (derive tags/title/
      preview, new id + timestamps; apply Balise's real create rules).
      Done: readonly aggregate; empty content allowed (no not-empty throw). `create` takes an
      optional `opts` ({id, createdAt, updatedAt, pinned, archived}) so journal-day notes and
      sync imports can pin those without a second factory; everything omitted defaults to a
      fresh id and "now".
- [x] `withContent(content, magicRules)`, `buildFile()`, `static fromFile(text)`,
      `static fromRow(row)`, `toRow()`, `toListItem()`.
      Done, **except `fromRow`**: under the `NoteListItem` projection (decision 2) plus the new
      `fromListItem` (reconstitutes the immutable shell for an edit), nothing needs a full `Note`
      rebuilt from a raw DB row, so `fromRow` would be dead code. Omitted on the Simplicity-First
      rule; add it if a later concept needs a full-note-from-row load. `toRow()` returns a
      `NoteRow` (flags as 0/1, snake_case dates); the repo owns column order.
- [x] `NoteListItem` and `NoteSearchResult` types.
      Done (+ `NoteRow` for the upsert projection). `NoteListItem` uses camelCase
      `createdAt`/`updatedAt`; components are repointed at cutover (Concept 09).
- [x] `newNoteContent(titleText, activeTag)` (pure; service supplies `m.note_new_title()`).
      Done: pure in the domain; the service re-exports a `newNoteContent(activeTag)` wrapper that
      injects `m.note_new_title()`, keeping the existing call site stable.

### Data Access (`core/repositories/note.repo.ts`)
- [x] `noteRepo` singleton speaking `Note`/`NoteListItem`. Port every query from
      `notes.repo.ts` as use-case methods: `findByTags`, `findUntagged`, `findById`,
      `loadContent`, `save` (DB + tags + file + mtime), `delete` (tombstone + row + file),
      `findByCreatedDate`, the journal queries, `allMeta`, `createdDates`, `search`.
      `getDb()` is internal; no `Database` parameter; no `extractTitle`/`extractTags` import.
      Note: `queryActiveTaskNotes`/`queryRecentDoneNotes` move to Concept 05.
      Done: all listed methods present (journal queries are `findJournalByDate` +
      `journalCreatedDates`). `save` is one `INSERT … ON CONFLICT(id) DO UPDATE` (preserves
      flags + created_at on a local edit, same contract as the old UPDATE; new rows take every
      column) — chosen over `INSERT OR REPLACE` so rowid and the FTS triggers behave exactly as
      before. A separate `importNote(note)` upserts applying every field (sync semantics), no
      file. `note_tags` writes (`setNoteTags`/`resolveCanonicalTags`, casing-preserving) are
      private here, as Concept 01 reserved. `queryNoteUpdatedAt` not ported (the aggregate now
      carries `updatedAt`); `queryNotesWithContentByIds` not ported (no caller; pre-existing dead
      code left in the old repo).
- [x] File IO (`writeFile`, `deleteFile`) lives inside `noteRepo`, using
      `core/repositories/backend/fs` and `core/repositories/backend/tauri` (mtime), calling
      `note.buildFile()`. Expose `writeFile`/`deleteFile` for the Sync compatibility surface.
      Done: `writeFile` writes `note.buildFile()` then best-effort `setDeskFileMtime`; `delete`
      uses `deleteFile` internally; both `writeFile`/`deleteFile`/`insertDeletion` are public for
      sync. Frontmatter byte-format verified against `src-tauri/src/sync/note_file.rs` in a test.

### Application (`core/services/notes.svelte.ts`)
- [x] Singleton `notesService` with `$state notes: NoteListItem[]`.
      Done.
- [x] Thin use cases: `create`, `update`, `delete` (tombstone + `eventBus` emissions),
      `load`, `loadContent`, `createForDate`, `importNote` (sync path). Each builds/edits a
      `Note` via the domain, calls one `noteRepo` method, updates state, emits. No SQL.
      Done: `update` reconstitutes the immutable shell via `Note.fromListItem(meta)` (list item,
      or `findById` fallback) then `.withContent(...)`, so the file mirror keeps the real
      created_at/flags without a content round trip. `ImportOptions` drops the old `create` flag
      — `save`/`importNote` are idempotent upserts, so create-vs-update is automatic. No
      `uiState` import (would cycle): callers still pass `newNoteContent(activeTag)`.
- [x] Keep `noteDates`/`noteCountsByDay` here; journal-specific day methods go to Concept 04.
      Done: both here (over `noteRepo.createdDates()`); `journalNoteDates`/`queryForDate`/
      `loadForDay` deferred to Concept 04 (the repo methods they need are already ported).

### Tests (`core/domain/note.test.ts`)
- [x] `Note.create` derives tags/title/preview from content and sets timestamps.
      Done (+ empty content, + opts overrides).
- [x] `buildFile`/`fromFile` round-trip (frontmatter to fields and back).
      Done (+ exact on-disk byte format, + body containing a `---` rule, + no-frontmatter input).
- [x] `withContent` re-derives tags/title/preview and bumps `updatedAt`.
      Done (preserves id/created_at/flags; bumps off a stored timestamp).
- [x] `newNoteContent` with and without an active tag.
      Done (+ the untagged sentinel emits no hashtag). 15 tests pass.

## Definition of Done
- [x] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/note.test.ts` passes.
      15 new tests; full suite 475 passed (was 460 after Concept 01).
- [x] `pnpm lint` passes.
      `prettier --check` + `eslint` clean on the four new files (bare `pnpm lint` still trips on
      the pre-existing `src-tauri/target` artifact noted in Concept 00).
- [x] Self-audit: `note.repo.ts` has no `extractTitle`/`notePreview`/`extractTags` import and
      no `Database` parameter; the `Note` aggregate does all derivation; `notes.svelte.ts`
      has no `getDb`/SQL and its methods are thin sequencers.
      Verified by grep: the only `extractTitle`/`getDb` hits in repo/service are the comments
      documenting their absence.
- [x] Compatibility surface preserved (below).
      `notesService.{loadContent,update,importNote,notes}`, `noteRepo.{allMeta,insertDeletion,
      writeFile,deleteFile}`, `Note.fromFile` all present. (Note: sync is currently native Rust,
      so these TS surfaces have no live callers today; kept for the future TS-sync repoint.)
- [x] Dashboard updated.

## Compatibility surface (out-of-scope Editor and Sync, repointed at cutover)
- **Editor** calls: `notesService.loadContent(id)`, `notesService.update(id, content)`,
  selection over `notesService.notes`. Keep these signatures.
- **Sync** (`fs-sync`, `device-sync`) calls: `notesService.importNote(id, content, opts)`,
  `noteRepo.allMeta`, `noteRepo.insertDeletion` (tombstones), `noteRepo.writeFile`,
  `noteRepo.deleteFile`, and `Note.fromFile` for import. Keep an equivalent for each. Grep
  the exact current call sites before cutover so none is missed.
