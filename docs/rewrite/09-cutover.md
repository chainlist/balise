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
- [ ] `routes/(app)/+page.svelte` (main note editor host). Thin today: imports
      `notesService` and `uiState`. Repoint to `core` services.
- [ ] `routes/(app)/journal/+page.svelte`. Repoint to `journalService`/`notesService`.
- [ ] `routes/(app)/tasks/+page.svelte`. Repoint to `tasksService`.
- [ ] `routes/(app)/graph/+page.svelte`. Repoint to `graphService`/`tagsService`.
- [ ] `routes/quick/+page.svelte` (quick capture window). Repoint.
- [ ] `routes/(app)/+layout.svelte` and `routes/+layout.svelte`. Repoint bootstrap to
      `core/services/app-bootstrap`.

### Component groups (repoint imports; rewrite only if the layering forces it)
- [ ] `components/sidebar/*` (notes panel, tags card, tag filter, desk sheets): heaviest
      group; repoint to `notesService`/`tagsService`/`desksService`/`uiState`.
- [ ] `components/notes/*` (NoteEditor, EditorHeader, NotePreview, TagNavigator, dialogs):
      repoint. NoteEditor wraps the out-of-scope editor; use the Tags compatibility method.
- [ ] `components/settings/*`: repoint to `core/services/settings/*`.
- [ ] `components/graph/*`, `components/tasks/*`: repoint; pull pure geometry from
      `core/domain/graph.ts` / `core/domain/task.ts`. **Note:** the graph geometry move was
      deferred from Concept 06 — the pure parts of `components/graph/sunburst.ts` and
      `force-graph.ts` (arc/chord/sunburst math, node-radius/adjacency/transform helpers)
      still need to be moved into `core/domain/graph.ts` here before the components repoint;
      leave `force-sim.ts`/`force-render.ts` (d3 + canvas) in the components.
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
