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
- [ ] `sanitizeDeskName(name)` (pure string rules; throws on empty).
- [ ] `DEFAULT_DESK` constant.
- [ ] `canRemoveDesk(desks)` rule (must keep at least one).
- [ ] `isAppDataFolder(name)` (dot-prefixed folders are not desks).

### Data Access (`core/repositories/desk.repo.ts`)
- [ ] Port `getBaseDir`, `ensureDeskFolder`, `openDesk`, `listDesks`, `renameDeskFiles`,
      `deleteDeskFiles`. Use `core/repositories/backend/db` for open/close and
      `@tauri-apps/plugin-fs` for folder ops (this repo and `core/repositories/backend/fs`
      are the fs chokepoints). Filter app
      data folders via the domain rule.

### Application (`core/services/desks.svelte.ts`)
- [ ] Singleton `desksService` with `$state desks`, `$state activeDesk`, persisted via the
      store adapter (move the `ui-state.json` desk keys here, or share the store; decide and
      note it).
- [ ] `init()` loads persisted desks/active desk; subscribes to `eventBus.desks.created`
      to merge disk desks.
- [ ] `addDesk`, `renameDesk`, `removeDesk`, `setActiveDesk`, `refreshActiveDesk`.
- [ ] `switchDesk(desk, activeTag)`: open DB, point fs adapter, run fs-sync (out-of-scope
      module, call it as-is), reload `notesService`/`tagsService`, rollback on failure.
      Keep the exact rollback behavior from `ui-state.switchDesk`.

### Tests (`core/domain/desk.test.ts`)
- [ ] `sanitizeDeskName`: trims, replaces illegal chars, throws on empty.
- [ ] `canRemoveDesk`: false when one desk remains, true otherwise.
- [ ] `isAppDataFolder`: dot-prefixed true, normal false.

## Definition of Done
- [ ] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/desk.test.ts` passes.
- [ ] `pnpm lint` passes.
- [ ] Self-audit: domain has no IO; repo reaches Tauri only through the backend client
      (`repositories/backend/*`); service has no SQL/fs calls except through the repo.
- [ ] Dashboard updated.

## Notes
- `switchDesk` depends on Notes (02) and Tags (01) services and on the out-of-scope
  fs-sync. Build the orchestration against those. The UI still calls the old `uiState`
  until cutover, so this service is exercised only by its own code until Concept 09.
- Decide where the active-desk and desk-list persistence lives (today: `ui-state.json`).
  Keeping a single `workspace` store owned by `desksService` is cleaner; record the choice.
