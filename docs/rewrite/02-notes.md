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
- [ ] `Note` class with fields and `static create(content, magicRules)` (derive tags/title/
      preview, new id + timestamps; apply Balise's real create rules).
- [ ] `withContent(content, magicRules)`, `buildFile()`, `static fromFile(text)`,
      `static fromRow(row)`, `toRow()`, `toListItem()`.
- [ ] `NoteListItem` and `NoteSearchResult` types.
- [ ] `newNoteContent(titleText, activeTag)` (pure; service supplies `m.note_new_title()`).

### Data Access (`core/repositories/note.repo.ts`)
- [ ] `noteRepo` singleton speaking `Note`/`NoteListItem`. Port every query from
      `notes.repo.ts` as use-case methods: `findByTags`, `findUntagged`, `findById`,
      `loadContent`, `save` (DB + tags + file + mtime), `delete` (tombstone + row + file),
      `findByCreatedDate`, the journal queries, `allMeta`, `createdDates`, `search`.
      `getDb()` is internal; no `Database` parameter; no `extractTitle`/`extractTags` import.
      Note: `queryActiveTaskNotes`/`queryRecentDoneNotes` move to Concept 05.
- [ ] File IO (`writeFile`, `deleteFile`) lives inside `noteRepo`, using
      `core/repositories/backend/fs` and `core/repositories/backend/tauri` (mtime), calling
      `note.buildFile()`. Expose `writeFile`/`deleteFile` for the Sync compatibility surface.

### Application (`core/services/notes.svelte.ts`)
- [ ] Singleton `notesService` with `$state notes: NoteListItem[]`.
- [ ] Thin use cases: `create`, `update`, `delete` (tombstone + `eventBus` emissions),
      `load`, `loadContent`, `createForDate`, `importNote` (sync path). Each builds/edits a
      `Note` via the domain, calls one `noteRepo` method, updates state, emits. No SQL.
- [ ] Keep `noteDates`/`noteCountsByDay` here; journal-specific day methods go to Concept 04.

### Tests (`core/domain/note.test.ts`)
- [ ] `Note.create` derives tags/title/preview from content and sets timestamps.
- [ ] `buildFile`/`fromFile` round-trip (frontmatter to fields and back).
- [ ] `withContent` re-derives tags/title/preview and bumps `updatedAt`.
- [ ] `newNoteContent` with and without an active tag.

## Definition of Done
- [ ] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/note.test.ts` passes.
- [ ] `pnpm lint` passes.
- [ ] Self-audit: `note.repo.ts` has no `extractTitle`/`notePreview`/`extractTags` import and
      no `Database` parameter; the `Note` aggregate does all derivation; `notes.svelte.ts`
      has no `getDb`/SQL and its methods are thin sequencers.
- [ ] Compatibility surface preserved (below).
- [ ] Dashboard updated.

## Compatibility surface (out-of-scope Editor and Sync, repointed at cutover)
- **Editor** calls: `notesService.loadContent(id)`, `notesService.update(id, content)`,
  selection over `notesService.notes`. Keep these signatures.
- **Sync** (`fs-sync`, `device-sync`) calls: `notesService.importNote(id, content, opts)`,
  `noteRepo.allMeta`, `noteRepo.insertDeletion` (tombstones), `noteRepo.writeFile`,
  `noteRepo.deleteFile`, and `Note.fromFile` for import. Keep an equivalent for each. Grep
  the exact current call sites before cutover so none is missed.
