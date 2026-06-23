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
- [x] `components/notes/*` (NoteEditor, EditorHeader, NotePreview, TagNavigator, dialogs):
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
      `utils/markdown-patterns`, an un-migrated shared util.) **`notes/Editor.svelte` done (with the
      Editor (cm) slice):** `settingsService` → `core`, `activeEditorService` →
      `core/services/active-editor`; the `$lib/utils/cm` barrel stays (kept editor subsystem).
- [x] `components/settings/*`: repointed to `core`. In-scope flips: `settingsService`
      (`core/services/settings/settings.svelte`), `themeService` (`core/services/theme.svelte`),
      `tagsService` (`core/services/tags.svelte`), `updaterService`, `toasterService`/`errorMessage`,
      `uiState`, plus the domain pulls (`Theme` → `core/domain/theme`; `Tag` → `core/domain/tag`;
      `MESH_*`/`MeshMode`/`MAGIC_TAG_MATCH_TYPES`/`MagicTagMatchType`/`SYNC_INTERVAL_OPTIONS` →
      `core/domain/settings`). `SUPPORTED_LOCALES` had no `core` home → repointed `GeneralSettings`
      to the canonical `SUPPORTED_LANGUAGES` from `core/domain/settings` (same values). `MagicTag`
      (old) → `MagicTagRule` (domain), an identical `{pattern,matchType,tag}` shape.
      **Global-shortcut merge (Concept 08-forced):** the old `globalShortcutService` (apply/recheck/
      status) was folded into the app-shell `shortcutsService` (the `core/services/system/global-shortcut`
      wrapper is now just the OS `register`/`unregister` seam), so `ShortcutsSettings` calls
      `shortcutsService.recheck`/`.apply`/`.status` and drops the `globalShortcutService` import.
      **Desk reads:** `DesksSettings` + `SyncSharingSettings` moved `uiState.desks`/`activeDesk` →
      `desksService` (matching the sidebar split; `DesksSettings`'s `uiState` import dropped as it
      became unused). **Deferred (left in place):** the sync/device components (`EnterCodeForm`,
      `ShowCodePanel`, `DeviceEditDialog`, `DeviceDeleteDialog`, `DeviceFields`, `SyncLinkedDevices`)
      keep `services/sync/*` + `utils/device-id` + `utils/sync` for the **Sync** slice (only their
      `toaster`/`settings` imports flipped); `AboutSettings`/`GeneralSettings` keep `utils/init-app`
      (`checkForNews`/`applyLanguageChange`) for the **bootstrap/layout** slice; `EditorSettings`
      keeps `utils/cm`'s `MarkMode`; `config/app-shortcuts` (not a migrated path) stays.
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
- [x] `components/*` top-level (CommandPalette, TitleBar, wizard, modals): repoint.
      `NewsModal`, `UpdateNotifier`, `TagName`, `WizardModal`, `WizardStepMarks`, `WizardStepTheme`
      repointed to `core` (`uiState`/`updaterService`/`themeService`/`settingsService`/`tagsService`,
      plus domain pulls: `Theme` → `core/domain/theme`, `Tag`/`RelatedTag`/`tagDisplayName` →
      `core/domain/tag`, `MarkMode` → `core/domain/settings`). `TitleBar`, `WizardStepLanguage`,
      `WizardStepWelcome`, `WizardStepDone` needed no change. **`MarkMode` decision:** repointed the
      wizard's type to `core/domain/settings` (the setting's canonical home; identical
      `'always'|'cursor'|'never'` union to `utils/cm`) since the wizard only consumes it as a
      settings value and never touches CodeMirror — `EditorSettings`'s deferred `utils/cm` `MarkMode`
      is the Editor slice's concern. **`WizardModal`:** `getBaseDir` now `desksService.getBaseDir()`;
      kept `applyLanguageChange` from `utils/init-app` (bootstrap/layout slice, consistent with
      `GeneralSettings`/`AboutSettings`). **CommandPalette (layering-forced rewrite):** presentation
      can't reach `notes.repo`/`getDB`, so added a thin `notesService.search(query)` wrapping the
      existing `noteRepo.search`; the palette now calls it and the `searchNotes`/`getDB` imports are
      gone. The presentation `>= 3` length guard was **dropped** — the repo owns the FTS-vs-title-LIKE
      gating, so 1–2 char queries now match note titles (was: nothing). Desk reads moved
      `uiState.desks`/`activeDesk` → `desksService`; `uiState.switchDesk` → `desksService.switchDesk`
      + `uiState.clearSelection()` (the 4th user-switch site, matching the sidebar split).
      **Left in place:** `ColorPicker` keeps `utils/color-palette` (pure config, no `core` home, not a
      layering violation — a genuinely-still-used helper; decide at flatten); `CommandPalette` keeps
      `config/app-shortcuts` (not a migrated path).

### Out-of-scope subsystems (repoint only)
- [x] Editor (`utils/cm/*`, `components/cm/*`): repointed note content read/write and tag
      extraction to the new services per the Concept 02/01 compatibility surfaces.
      **Service/domain flips:** `tagsService`/`settingsService`/`uiState`/`activeEditorService`/
      `linkPreviewService` → `core/services/*`; `SYSTEM_TAGS`/`tagDisplayName`/`parseAllHashtags`
      → `core/domain/tag`; `HASHTAG_RE`/`HASHTAG_STRIP_RE`/`TASK_STATUS_COLOR` → `core/domain/task`.
      **Consolidate-into-core decision (was: keep editor helper utils):** the editor's pure
      parsing/format primitives are now single-sourced in `core/domain`, not duplicated in `utils`.
      `core/domain/tag.parseAllHashtags` was made public and gained a `length` field (for the
      `tagPlugin` decoration ranges; `groupHashtagOccurrences` is unaffected); `HASHTAG_STRIP_RE`
      exported from `core/domain/task`; new `core/domain/datetime.ts` (`formatDate`/
      `buildDateFormatOptions`, importing `DateFormat` from `core/domain/settings`) replaces
      `utils/date-format`, with `datetime.test.ts`. The other live `date-format` consumers
      (`JournalDay`, `NotesPanel`, `GeneralSettings`) were repointed too; `EditorSettings`'s
      deferred `MarkMode` now comes from `core/domain/settings` (wizard precedent). **Attachment
      write seam:** `embedPlugin`'s paste/drop image save no longer touches the backend `fsService`
      directly; `assetsService.saveAttachment(blob)` was added to the existing app-layer seam
      (mirrors `readImage`), and `cm/EmbedImageViewer` now reads via `assetsService.readImage`.
      **Not deleted yet:** old `utils/{tag-parser,task-parser,tag-constants,date-format}.ts` stay
      until the deletion step (old service island + `config/app-shortcuts` still import them).
      **Flagged:** `config/app-shortcuts.ts` still imports the old `notes`/`ui-state`/`active-editor`/
      `settings`/`toaster`/`eventBus`/`shortcuts` singletons (live via `CommandPalette`); repoint it
      with the app-shell/shortcuts cutover (its `date-format` import left for that pass).
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
