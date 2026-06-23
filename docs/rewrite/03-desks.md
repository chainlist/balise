# Concept 03: Desks

**Goal:** rebuild the desk (workspace) concept: name rules, folder and DB lifecycle, and
the desk-switching use case. Today this logic is split between `services/platform/desk.ts`
(folder/DB IO) and `ui-state.svelte.ts` (desk list, active desk, `switchDesk`). The
workspace use cases move into a dedicated `desksService`; `ui-state` keeps only UI
selection state (Concept 08).

**Depends on:** 00 (db, fs adapters). Touches Notes and Tags services for reload on switch.

## What "desks" covers

- A desk is a folder under `Documents/Balise/<deskName>` with its own SQLite DB.
- Name sanitization and validation (`sanitizeDeskName`, the "at least one desk" rule).
- Listing desks from disk, creating, renaming (folder + DB files + WAL/SHM), deleting.
- Switching the active desk: open DB, point fs adapter, run fs-sync, reload notes/tags,
  with rollback to the previous desk if any step fails.

## Old to new mapping

| Old | New layer | New file |
| --- | --- | --- |
| `desk.ts`: `sanitizeDeskName`, default desk name, the "keep at least one" rule | Domain | `core/domain/desk.ts` |
| `desk.ts`: `getBaseDir`, `ensureDeskFolder`, `openDesk`, `listDesks`, `renameDeskFiles`, `deleteDeskFiles` | Data Access | `core/repositories/desk.repo.ts` |
| `ui-state.svelte.ts`: `desks`, `activeDesk`, `addDesk`, `renameDesk`, `removeDesk`, `switchDesk`, `setActiveDesk`, `refreshActiveDesk`, `setDesks`, `#mergeDesksFromDisk` | Application | `core/services/desks.svelte.ts` |

## Todos

### Domain (`core/domain/desk.ts`)
- [x] `sanitizeDeskName(name)` (pure string rules; throws on empty).
- [x] `DEFAULT_DESK` constant. (`'Personal'`, matching the old `ui-state` default.)
- [x] `canRemoveDesk(desks)` rule (must keep at least one). Returns `desks.length > 1`.
- [x] `isAppDataFolder(name)` (dot-prefixed folders are not desks).

### Data Access (`core/repositories/desk.repo.ts`)
- [x] Port `getBaseDir`, `ensureDeskFolder`, `openDesk`, `listDesks`, `renameDeskFiles`,
      `deleteDeskFiles`. Use `core/repositories/backend/db` for open/close and
      `@tauri-apps/plugin-fs` for folder ops (this repo and `core/repositories/backend/fs`
      are the fs chokepoints). Filter app data folders via the domain rule.
      Done: object literal `deskRepo` with `getBaseDir`, `open` (= old `openDesk`, now also
      points the fs adapter so the service never touches the backend client), `list`
      (= `listDesks`, filtered via `isAppDataFolder`), `rename` (= `renameDeskFiles`),
      `delete` (= `deleteDeskFiles`). `ensureDeskFolder` + `removeIfExists` are private
      module helpers. Uses `loadDb`/`closeDbIfMatches` from `backend/db` and `sanitizeDeskName`
      from the domain.

### Application (`core/services/desks.svelte.ts`)
- [x] Singleton `desksService` with `$state desks`, `$state activeDesk`, persisted via the
      store adapter. **Decision:** a dedicated `workspace.json` store owned by `desksService`
      (not shared with `ui-state.json`) — cleaner ownership. Cutover (09) must copy
      `activeDesk`/`desks` from the old `ui-state.json` so existing users keep their desks.
- [x] `init()` loads persisted desks/active desk; subscribes to `eventBus.desks.created`
      to merge disk desks (`#mergeDesksFromDisk`).
- [x] `addDesk`, `renameDesk`, `removeDesk`, `setActiveDesk`, `refreshActiveDesk`.
      `renameDesk(old, new, activeTag?)` threads `activeTag` through to its `switchDesk`
      (the active tag is UI state owned elsewhere, so it's passed in, not read).
- [x] `switchDesk(desk, activeTag)`: open DB + point fs adapter (one `deskRepo.open` call),
      run fs-sync (out-of-scope module, called as-is), reload `notesService`/`tagsService`,
      rollback on failure. Rollback behavior preserved from `ui-state.switchDesk`. The
      UI-selection reset (activeTag/activeDay/composedTags) is deliberately NOT here — it
      stays with `ui-state` (Concept 08); `switchDesk` only reloads using `activeTag`.

### Tests (`core/domain/desk.test.ts`)
- [x] `sanitizeDeskName`: trims, replaces illegal chars, throws on empty.
- [x] `canRemoveDesk`: false when one desk remains, true otherwise.
- [x] `isAppDataFolder`: dot-prefixed true, normal false.

## Definition of Done
- [x] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/desk.test.ts` passes
      (full suite: 486 tests green).
- [x] Lint passes for the new/changed files (`prettier --check` + `eslint` on them is clean).
      Repo-wide `pnpm lint` still exits non-zero on a large pre-existing set of unformatted
      files (generated paraglide output, routes, every `docs/rewrite/*.md`) — a baseline
      condition unrelated to this concept, not introduced here.
- [x] Self-audit: domain has no IO; repo reaches Tauri only through the backend client
      (`repositories/backend/*`) + the sanctioned `plugin-fs` folder ops; service has no
      SQL/fs calls except through the repo.
- [x] Dashboard updated.

## Notes
- `switchDesk` depends on Notes (02) and Tags (01) services and on the out-of-scope
  fs-sync. Built against those. The UI still calls the old `uiState` until cutover, so
  this service is exercised only by its own code until Concept 09.
- **Persistence:** dedicated `workspace.json` (decided above). Cutover migrates the two
  keys from `ui-state.json`.
- **`DESKS_ROOT_DIR` re-home:** the 00 note said move it into the desk *domain*, but the
  import matrix forbids the backend client (`backend/fs`, `backend/store`) from importing
  the domain. Resolved by treating `'Balise'` as a storage-location *data-access* detail:
  it's now exported once from `backend/fs.ts` and imported by `backend/store.ts` and
  `desk.repo.ts` (de-duplicated, matrix-clean). Only `sanitizeDeskName` moved to the domain;
  `backend/fs`'s `setDesk` dropped its private copy and now receives an already-safe name
  from `deskRepo.open`.
- **Settings sync seam:** old `renameDesk`/`removeDesk` called `settingsService.sync`
  (`renameSharedDesk`/`forgetDesk`) to carry/forget a desk's share choice. To avoid a
  new→old import, `desksService` now emits `eventBus.desks.renamed`/`removed` instead;
  **Concept 07 (Settings) wires the sync-settings subscriber.** Nothing listens yet.
- **fs-sync desk pointing (cutover gap):** `switchDesk` points the *new* `backend/fs`
  adapter, but the out-of-scope `fsSyncService.syncDeskFiles()` still reads the *old*
  `services/platform/fs` adapter. They reconcile at cutover when fs-sync is repointed to
  the new backend fs; until then `switchDesk` isn't live.
- **`deleteDeskFiles` orchestration:** old deletion lived in `DeleteDeskSheet.svelte`
  (switch-away → `deleteDeskFiles` → `removeDesk`). Ported the file deletion to
  `deskRepo.delete`; the orchestration is presentation-layer and is repointed at Concept 09
  (presentation can't call the repo directly, so 09 adds a `desksService.deleteDesk` step or
  routes it through existing service methods). `removeDesk` itself only edits the list +
  reassigns the active desk, exactly as before.
- **WizardModal compat:** `desksService.getBaseDir()` is a thin passthrough to
  `deskRepo.getBaseDir()` so the new-desk wizard (presentation) reaches the path through a
  service at cutover.
