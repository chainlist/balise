# Codebase Review

Scope: all source code except `src/lib/components/shadcn/`.

---

## Bugs

### B1. Unsaved content race on note delete (HIGH)

**File:** [NoteEditor.svelte:108-113](src/lib/components/notes/NoteEditor.svelte#L108-L113)

The editor debounces saves with a 500 ms `setTimeout`. When the user confirms a delete, `notesService.delete(note.id)` removes the note from the DB and filesystem. If the save timer fires after that (the note is now gone), `notesService.update()` is called on a non-existent row. The SQL `UPDATE` silently succeeds (zero rows affected), tags sync runs against a ghost ID, and then `fsSyncService.syncNoteFile()` writes the deleted note back to disk as a `.md` file. That orphan file will be re-imported on the next desk switch.

**Fix:** Cancel the save timer before deleting the note, or skip the save callback when the note ID is no longer in `notesService.notes`.

---

### B2. Timezone bug in `syncDeskFiles` mtime comparison (HIGH)

**File:** [fs-sync.ts:102](src/lib/services/fs-sync.ts#L102)

```ts
if (fileStat.mtime.getTime() > new Date(dbUpdatedAt).getTime()) {
```

`dbUpdatedAt` comes from SQLite's `datetime('now')`, which produces `"2024-01-15 10:30:00"` in UTC. JavaScript's `new Date("2024-01-15 10:30:00")` (no timezone suffix) is spec-defined as local time in V8/browser environments. On a system at UTC+2, the parsed value is 2 hours behind the actual stored UTC time, making `dbUpdatedAt` appear 2 hours earlier than it is. This causes files to appear newer than the DB version more often than they should, triggering unnecessary re-imports.

**Fix:** Append `Z` when constructing the Date: `new Date(dbUpdatedAt + 'Z')`.

---

### B3. Stale search results race condition in CommandPalette (MEDIUM)

**File:** [CommandPalette.svelte:39-42](src/lib/components/CommandPalette.svelte#L39-L42)

```ts
async function handleInput(value: string) {
    query = value;
    noteResults = value.trim().length >= 3 ? await searchNotes(getDB(), value) : [];
}
```

Called on every `input` event with no debouncing. Multiple in-flight `searchNotes` queries can be alive simultaneously. The last one to resolve wins regardless of input order, so a slow query for `"ap"` could overwrite results for `"apple"`.

**Fix:** Debounce `handleInput` or cancel the previous query before issuing a new one (e.g. using an abort token or a counter to discard stale results).

---

### B4. `loadDB` race condition on concurrent calls (MEDIUM)

**File:** [db.ts:24-37](src/lib/utils/db.ts#L24-L37)

If `loadDB("foo")` is called twice in rapid succession before the first `Database.load()` resolves, both see `db === null` and both proceed. The module-level `db` will be set by whichever finishes last. The first-resolved connection is abandoned (leaked). Practically this can happen if two services call `loadDB` as part of app initialization before the first load completes.

**Fix:** Store a pending promise: `let loadingPromise: Promise<Database> | null = null` and return it on concurrent calls to the same DB name.

---

### B5. In-memory note list goes out of order after updates (LOW)

**File:** [notes.svelte.ts:62-68](src/lib/services/notes.svelte.ts#L62-L68)

`notesService.update()` mutates the note's `title`, `preview`, and `updated_at` in-place in `this.notes`, but never re-sorts the array. Since the SQL query orders by `updated_at DESC`, after a few saves the most recently edited note will no longer appear at the top in the UI. The order only corrects when the user switches tags (triggering a fresh `load()`).

**Fix:** After updating `inList.updated_at`, move the note to the front of the array.

---

### B6. `notePreview` title-location search is fragile (LOW)

**File:** [note-title.ts:9-13](src/lib/utils/note-title.ts#L9-L13)

```ts
const rest = title ? content.slice(content.indexOf(title) + title.length) : content;
```

`indexOf` finds the first occurrence of the title string in the full content. If the title word appears earlier in the content (e.g. in a tag or in a prior line), the slice starts from the wrong position. For content `"cat\n\n# cat\n\nbody"`, the first `"cat"` is at position 0, so the preview becomes `"\n\n# cat\n\nbody"` instead of `"body"`.

**Fix:** Instead of searching by string, split on newlines and skip the first non-empty line directly.

---

## Design Issues

### D1. `removeDesk` silently orphans files on disk

**File:** [ui-state.svelte.ts:74-86](src/lib/services/ui-state.svelte.ts#L74-L86)

`removeDesk` removes the desk from the `desks` store but does not call `deleteDeskFiles`. The SQLite DB and all markdown files for that desk remain on disk permanently. The `deleteDeskFiles` function exists in [desk.ts](src/lib/services/desk.ts) but is never called from here. Decide whether desk removal is a soft-delete (by design) or a hard-delete, and document or enforce that decision.

---

### D2. Dashboard `totalNotes` is stale after note creation

**File:** [dashboard/+page.svelte:44-47](src/routes/dashboard/+page.svelte#L44-L47)

`totalNotes` is fetched once in `onMount` and never updated. If the user creates a note and returns to the dashboard, the count is wrong. Unlike `tagsService.tags` (which is reactive `$state`), `totalNotes` is a plain `let` fetched once. Either expose a reactive count on `notesService` or re-query on each visit.

---

### D3. `localStorage` mixed with Tauri store for wizard state

**File:** [+layout.svelte:26](src/routes/+layout.svelte#L26)

```ts
uiState.isWizardOpen = !localStorage.getItem('balise_onboarding_done');
```

Settings use `@tauri-apps/plugin-store` (persisted to the app data directory). The wizard completion flag uses `localStorage` (WebView origin storage, cleared if the WebView is reset). These have different lifecycle guarantees. Migrate the flag to the Tauri store for consistency.

---

### D4. `tagsService.load()` called on every note save, and N times during batch sync

**File:** [tags.svelte.ts:94-104](src/lib/services/tags.svelte.ts#L94-L104), [fs-sync.ts:110](src/lib/services/fs-sync.ts#L110)

`syncNoteTags` calls `this.load()` at the end, which executes 2 SQL queries and replaces the full `tags` array. This is called on every 500 ms debounced save. Worse, during `syncDeskFiles`, `tagsService.syncNoteTags` is called for every new/updated file in a `Promise.all`, spawning N concurrent `tagsService.load()` calls. Only the last one to resolve wins; the rest are wasted work.

**Fix:** Remove `this.load()` from `syncNoteTags` and call it once after the batch sync finishes. Separate tag extraction from tag list refresh.

---

### D5. `NoteSignals` manual event bus duplicates Svelte 5 reactivity

**File:** [note-signals.ts](src/lib/services/note-signals.ts)

`NoteSignals` implements a manual observer pattern (`push`/`filter`/`forEach`) for two events: note selection and note deletion. In a Svelte 5 runes codebase, both of these could be handled with reactive state or derived state and a `$effect`. The signal bus adds indirection (handlers must manually subscribe and unsubscribe) where plain reactive state would be cleaner and less error-prone.

---

### D6. `{@html note.excerpt}` renders unsanitized HTML

**File:** [CommandPalette.svelte:89-91](src/lib/components/CommandPalette.svelte#L89-L91)

The `excerpt` field comes from SQLite's `snippet()` function and contains `<mark>` tags. If note content contains raw HTML (e.g. `<script>alert(1)</script>`), that content is injected into the DOM. In a Tauri desktop app the attack surface is limited (the user writes their own notes), but it enables note-content-based XSS if the app ever processes external markdown files.

**Fix:** Strip or escape all HTML from the content before FTS indexing, or sanitize the snippet before rendering.

---

### D7. Extra round-trip query in `notesService.update` for `updated_at`

**File:** [notes.svelte.ts:66-67](src/lib/services/notes.svelte.ts#L66-L67)

```ts
const ts = await queryNoteUpdatedAt(db, id);
if (ts) inList.updated_at = ts;
```

After calling `updateNoteContent` (which uses `datetime('now')` for `updated_at`), the code issues a second SELECT to retrieve the timestamp it just wrote. This adds a round-trip on every save. Use `toSQLiteUTC(new Date())` client-side (consistent with how `insertNoteAt` does it) to set the timestamp before the UPDATE, then reuse that value in-memory.

---

### D8. `syncDeskFiles` is expensive and not guarded against concurrent calls

**File:** [fs-sync.ts:65-127](src/lib/services/fs-sync.ts#L65-L127)

On a desk with N notes, `syncDeskFiles` runs N × 2 concurrent FS operations (one `readTextFile` + one `stat` per file) inside a single `Promise.all`. For large desks this is a significant fan-out. More importantly, if two desk switches happen quickly (e.g. desk picker clicked twice), two concurrent `syncDeskFiles` calls would race. The batch inserts use plain `INSERT` (not `INSERT OR IGNORE`) in `insertNoteWithMeta`, so concurrent syncs can produce unique-constraint errors.

---

## Minor Issues

**M1.** `journal/+page.svelte` draft note has an empty `title` field until the first save, even though the content starts with a dated heading. The in-memory `draftNote` should derive title/preview from its content so it is consistent with saved notes.

**M2.** `desk.ts:renameDeskFiles` is non-atomic: it renames individual files in sequence. A crash midway leaves the desk in a partially renamed state with no rollback path.

**M3.** `tag-parser.ts` allows purely numeric tags (`#12`, `#99`) because the pattern `[a-zA-Z0-9/]{2,}` has no requirement for at least one letter. This is probably unintentional.

**M4.** `settings.svelte.ts:setLanguage` accepts `string` but assigns to `$state<'fr' | 'es' | 'en'>`. TypeScript should flag this; if it does not, the strict-mode check should be verified.

**M5.** `AccordionSidebar.svelte:35` mutates `uiState.activeNoteId` directly inside a `$effect`, bypassing the setter pattern used for every other `UIState` field. At minimum this should be a setter method for consistency; at most it suggests that `activeNoteId` belongs in `NoteSelectionService` instead of `UIState`.
