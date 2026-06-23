# Concept 09: Pages and components cutover

**Goal:** flip the live app from the old code to the new `core/` stack, then delete the old
code and flatten `core/*` into `lib/`. This is the only concept that touches the running UI,
so it is the riskiest. Work it page by page; each page (or small component group) is a
committable chunk. This concept may span more than one session.

**Depends on:** all in-scope concepts (00 to 08) complete and tested.

## Order of operations

Cut over in this order so the app keeps running between chunks:

1. **Repoint imports, do not move files yet.** Change components/routes to import from
   `$lib/core/services/*` and `$lib/core/domain/*` instead of the old `$lib/services/*`,
   `$lib/repositories/*`, `$lib/models/*`, `$lib/utils/*`. Do this per page.
2. **Repoint the out-of-scope Editor and Sync** to the new Notes/Tags services (see the
   compatibility surfaces in 01 and 02). These keep their internals; only their imports of
   note/tag APIs change.
3. **Delete the old code** once nothing imports it.
4. **Flatten** `core/domain -> lib/domain`, `core/repositories -> lib/repositories` (the
   `backend/` client moves with it), `core/services -> lib/services` (including
   `services/system/`) (or keep `core/`; decide and record). Update the `$lib/core/...`
   imports to the final paths in one mechanical pass.

## Pages and components

### Routes (per-chunk)
- [x] `routes/(app)/+page.svelte` (main note editor host). Repointed `notesService`/`uiState`
      to `core`; landed with the notes-editor slice so the `NoteListItem` it passes into
      `NoteEditor` matches the new prop shape.
- [x] `routes/(app)/journal/+page.svelte`. Repointed `uiState`/`notesService`/`eventBus`
      to `core`; `journalNoteDates()` now from `journalService`; `{#key uiState.activeDesk}`
      now `desksService.activeDesk`.
- [x] `routes/(app)/tasks/+page.svelte`. Repointed `tasksService`/`uiState` to `core`;
      `uiState.activeDesk` (desk-change effect) now `desksService.activeDesk`.
- [x] `routes/(app)/graph/+page.svelte`. Repointed `graphService`/`themeService`/`uiState`
      to `core`; `tagDisplayName` + `type Tag` now from `core/domain/tag`; `assignGraphColors`
      + `DEFAULT_TAG_COLOR` from `core/domain/graph`; `uiState.activeDesk` now `desksService`.
- [ ] `routes/quick/+page.svelte` (quick capture window). Repoint. **Deferred:** the
      quick window boots via the still-old `init-quick` (initialises the old singletons),
      and the draft note uses the old `Note` shape, so cut it over together with its
      bootstrap and `NoteEditor`, not in isolation.
- [ ] `routes/(app)/+layout.svelte` and `routes/+layout.svelte`. Repoint bootstrap to
      `core/services/app-bootstrap`. **Do this last:** old and new services are separate
      stateful singletons, so the app only becomes runnable once the bootstrap flip and the
      whole `(app)` consumer tree have been repointed together.

### Component groups (repoint imports; rewrite only if the layering forces it)
- [x] `components/sidebar/*` (notes panel, tags card, tag filter, desk sheets): heaviest
      group; repointed to `notesService`/`tagsService`/`desksService`/`uiState` (all `core`).
      `Note` reads → `NoteListItem` (`updated_at` → `updatedAt`); `tagDisplayName`/`UNTAGGED_FILTER`
      now from `core/domain/tag`; `sanitizeDeskName`/`canRemoveDesk` from `core/domain/desk`.
      **Desk lifecycle rewritten (layering-forced):** the desk sheets no longer call
      `deleteDeskFiles`/`uiState` mutations directly. Added `desksService.deleteDesk(desk)`
      (the orchestration Concept 03 deferred: switch-away → `deskRepo.delete` → `removeDesk`);
      `DeleteDeskSheet` calls it and guards the min-desk message via the domain `canRemoveDesk`.
      `DeskSettingsSheet` rename passes `uiState.activeTag` through (new `renameDesk` defaults it
      to `null`). **Desk-switch UI reset:** old `uiState.switchDesk` reset the selection;
      the new split (desks vs ui-state) left no single seam, so added `uiState.clearSelection()`
      (in-memory reset, no reload — matches old behavior) called after `desksService.switchDesk`
      at the 3 user-switch sites (`SidebarHeader`, `AddDeskSheet`, `DeleteDeskSheet`).
      (Dropped a pre-existing unused `tagDisplayName` import in `TagSidebarItem` while rewriting
      its import block. `NotesPanel`'s `clearActiveTag` + `TagSidebarItem`'s `PinIcon`/`HashIcon`
      stay: pre-existing unused, on lines this slice didn't touch.)
- [~] `components/notes/*` (NoteEditor, EditorHeader, NotePreview, TagNavigator, dialogs):
      repoint. NoteEditor wraps the out-of-scope editor; use the Tags compatibility method.
      **Done:** `NoteEditor`, `EditorView`, `EditorHeader`, `NoteDeleteDialog`, `JournalDay`
      repointed to `core`. Editor prop type is now `NoteListItem & { content?: string }` (the
      `content` optional covers the journal in-memory draft); note date reads moved to
      `createdAt`/`updatedAt`; `EditorView` uses `tagsService.tagsForNote(content)` (the Tags
      compatibility method) instead of `getTagsForNote`; `parseDbTimestamp` from
      `core/domain/shared/time`; `JournalDay` now calls `journalService.createForDate`/
      `queryForDate`. (Removed a pre-existing unused `fade` import in `EditorView` since it sat
      in the import block being rewritten.) `NoteSummarySheet` + `TagNavigator` needed no change
      (only `utils/cm` / `TagChip` imports, both staying). **`NotePreview` done (with the sidebar
      slice):** its image-file read no longer imports the backend `fsService` directly (the matrix
      forbids presentation → backend client). **Decision:** added a thin app-layer
      `core/services/assets.ts` (`assetsService.readImage(path)`) wrapping `backend/fs`, mirroring
      how services reach `backend/store`; `NotePreview` reads through it. The same seam covers
      `cm/EmbedImageViewer` when the **Editor (cm)** slice lands. (`HIGHLIGHT_SOURCE` stays from
      `utils/markdown-patterns`, an un-migrated shared util.) **Deferred:** `notes/Editor.svelte`
      moves with the **Editor (cm)** slice (no `Note`-type coupling with `EditorView`; only its own
      `settingsService`/`activeEditorService` imports).
- [ ] `components/settings/*`: repoint to `core/services/settings/*`.
- [x] `components/graph/*`, `components/tasks/*`: repoint; pull pure geometry from
      `core/domain/graph.ts` / `core/domain/task.ts`. **Tasks done:** `tasks/TaskBoard.svelte`
      + `tasks/TaskBoardCard.svelte` repointed (`tasksService`/`toasterService`/`uiState` →
      `core`; `TaskItem`/`TaskStatus`/`TASK_STATUS_COLOR` → `core/domain/task`). **Graph done:**
      the geometry move (below) landed and every `graph/*` consumer (`Sunburst`, `Arc`, `Center`,
      `Chord`, `RelatedDot`, `ForceGraph`, `force-sim.ts`, `force-render.ts`) + the graph route now
      import the math from `core/domain/graph`. (Dropped a pre-existing unused `polar` import in
      `Sunburst.svelte` while repointing that line.) **Still pending:** editor `cm/TaskCard.svelte`'s
      `TASK_STATUS_COLOR` import, left for the Editor repoint pass. **Geometry move (was deferred from
      Concept 06) — DONE:** the pure parts of `components/graph/sunburst.ts` and `force-graph.ts`
      (arc/chord/sunburst math, node-radius/adjacency/transform helpers) were moved into
      `core/domain/graph.ts` and their unit tests into `core/domain/graph.test.ts`; the four old files
      were deleted; `force-sim.ts`/`force-render.ts` (d3 + canvas) stay in the components. `ForceNode`/
      `ForceLink` brought a **type-only** `d3-force` import into the domain (runtime stays in the
      components); `buildForceGraph` now takes the existing domain `WeightedEdge` instead of a
      duplicate local type. Full unit suite green (564 tests).
- [ ] `components/*` top-level (CommandPalette, TitleBar, wizard, modals): repoint.

### Out-of-scope subsystems (repoint only)
- [ ] Editor (`utils/cm/*`, `components/cm/*`): repoint note content read/write and tag
      extraction to the new services per the Concept 02/01 compatibility surfaces.
- [ ] Sync (`services/sync/*`, fs-sync, device-sync): repoint `importNote`, meta queries,
      tombstones, and note-file IO to the new Notes repo/service. Grep for every current
      call site first and check them off one by one.

## Deletion and flatten
- [ ] Grep for any remaining imports of `$lib/services/` (old), `$lib/repositories/`,
      `$lib/models/`, and the migrated `$lib/utils/*` files. Zero results before deleting.
- [ ] Delete old `services/`, `repositories/`, `models/`, and migrated `utils/*` (leave
      `utils/cm/*` and any genuinely-still-used helpers).
- [ ] Flatten `core/*` to final `lib/*` paths (or keep `core/`); update imports.
- [ ] Update `CLAUDE.md` folder-structure section to match the new tree.

## Definition of Done
- [ ] Every route and component group repointed and ticked.
- [ ] Editor and Sync still work end to end (manual run: create, edit, tag, delete a note;
      switch desk; sync if a peer is available).
- [ ] Old code deleted; no dangling imports.
- [ ] Full unit suite passes: `pnpm test:unit -- --run`.
- [ ] `pnpm lint` passes.
- [ ] `CLAUDE.md` updated.
- [ ] Dashboard shows all concepts done.

## Notes
- Because this concept changes the live app, prefer many small commits (one page or one
  component group each) over one large commit. Stop and ask the user to commit after each
  safe chunk, not only at the very end.
- Type-checking and building remain the user's responsibility. After cutover, ask the user
  to run their own type-check/build before considering the rewrite finished.
