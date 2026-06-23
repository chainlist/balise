# Concept 00: Foundation and conventions

**Goal:** create the `core/` skeleton and the shared pieces every later concept builds on:
the data-access backend client (db connection, filesystem, store, Tauri invoke wrappers) and
the shared domain primitives (id, time, markdown). No data concept is built here. After this
concept the layout exists and the shared domain is unit-tested.

**Depends on:** nothing.

## Target structure created here

```
src/lib/core/
  domain/
    shared/
      id.ts            # uuid generation (thin, framework-free)
      time.ts          # sqlite UTC <-> Date, local day keys, day counts
      markdown.ts      # title extraction, preview extraction (pure)
  repositories/
    backend/           # the data-access backend client (only TS that touches Tauri)
      db.ts            # connection owner: loadDb / getDb / closeDb (moved from utils/db.ts)
      fs.ts            # desk-scoped filesystem adapter (moved from services/platform/fs.ts)
      store.ts         # plugin-store wrapper + store path resolution
      tauri.ts         # typed invoke wrappers (migrate_desk_db, set_desk_file_mtime, ...)
  services/
    events/
      signal.ts        # generic Signal<T> (moved from services/events/signal.ts)
      event-bus.ts     # eventBus singleton (moved from services/events/event-bus.ts)
```

The `repositories/backend/` folder is not a separate layer; it is the part of Data Access
that reaches the Backend (Tauri). Only repositories import it. When the deferred Rust plan
lands, these modules are where the `invoke` calls to batched Tauri commands will live.

## Old to new mapping

| Old | New | Notes |
| --- | --- | --- |
| `utils/db.ts` | `core/repositories/backend/db.ts` | rename exports to `loadDb`/`getDb`/`closeDb`/`closeDbIfMatches`; same behavior |
| `services/platform/fs.ts` | `core/repositories/backend/fs.ts` | unchanged behavior, desk-scoped IO |
| `services/platform/store-path.ts` | `core/repositories/backend/store.ts` | path resolution + a small `loadStore(name)` helper |
| `utils/time.ts` | `core/domain/shared/time.ts` | pure date helpers + the day-key and day-count reducers from `notes.svelte.ts` |
| `utils/note-utils.ts` | `core/domain/shared/markdown.ts` | `extractTitle`, `notePreview` (pure) |
| `services/events/*` | `core/services/events/*` | copy as-is |

## Todos

### Domain (pure)
- [x] Create `core/domain/shared/id.ts` exporting `newId()` (wraps `crypto.randomUUID`).
      Done: thin one-liner, no imports.
- [x] Create `core/domain/shared/time.ts`: move `toSqliteUtc`, `parseDbTimestamp`, and add
      `toLocalDayKey(stamp)`, `toLocalDayKeys(stamps)`, `toLocalDayCounts(stamps)` (lifted
      out of `notes.svelte.ts`). Pure, no Tauri.
      Done: the two reducers now share the new `toLocalDayKey`. `msToIsoUtc` was left in the
      old `utils/time.ts` (not in the move list, no production consumers).
- [x] Create `core/domain/shared/markdown.ts`: move `extractTitle`, `notePreview`. Pure.
      Done: inlined the `HEADING_PREFIX_RE` literal so domain imports nothing (Concept 02
      Notes owns the markdown-pattern source of truth).

### Data-access backend client (the only TS that touches Tauri)
- [x] Create `core/repositories/backend/db.ts` from `utils/db.ts`. Keep the single shared
      connection and the desk-switching/close logic. This is the **only** module that imports
      `@tauri-apps/plugin-sql`. Export `getDb()`, `loadDb(name, opts)`, `closeDb()`,
      `closeDbIfMatches(name)`.
      Done: renamed exports; `closeDb()` is now public; `migrate_desk_db` goes through the
      `tauri.ts` wrapper (db.ts no longer imports `invoke`).
- [x] Create `core/repositories/backend/fs.ts` from `services/platform/fs.ts` (desk-scoped
      IO). Only module importing `@tauri-apps/plugin-fs` for note files.
      Done: behavior unchanged. `DESKS_ROOT_DIR` + `sanitizeDeskName` inlined (private) so the
      backend imports only Tauri; Concept 03 (Desks) re-homes them into the desk domain.
- [x] Create `core/repositories/backend/store.ts` from `services/platform/store-path.ts`,
      plus a `loadStore(fileName, opts)` helper that wraps `@tauri-apps/plugin-store` `load`.
      Done: `resolveStorePath`/`migrateLegacyStores`/`STORE_FILES` carried over; `loadStore`
      added; `DESKS_ROOT_DIR` inlined (same note as fs.ts).
- [x] Create `core/repositories/backend/tauri.ts`: typed wrappers for the invoke calls used
      across the app (`migrateDeskDb`, `setDeskFileMtime`, ...). Only module importing
      `@tauri-apps/api/core` invoke for these commands. This is where future batched-command
      invokes will be added.
      Done: wraps `migrate_desk_db` and `set_desk_file_mtime` (the two in-scope commands; sync
      invokes belong to the out-of-scope sync subsystem).

### Application (events)
- [x] Move `services/events/signal.ts` and `event-bus.ts` to `core/services/events/`.
      Keep the same channels (notes, sync, desks). Tests come with the copy.
      Done: copied verbatim (channels: notes, sync, desks, journal).

### Tests
- [x] `core/domain/shared/time.test.ts`: day-key for a known timestamp, day-counts grouping,
      UTC round-trip (port and extend `utils/time.test.ts`).
      Done: added timezone-robust day-key/keys/counts tests (stamps built from local
      wall-clock via `toSqliteUtc`); ISO-precision invariant kept with a literal ISO string.
- [x] `core/domain/shared/markdown.test.ts`: title from `### Heading`, empty content,
      preview truncation (port and extend `utils/note-utils.test.ts`).
      Done: ported `extractTitle`/`notePreview` cases (dropped `readingTimeMinutes`, not moved).
- [x] `core/services/events/signal.test.ts`: port existing `signal.test.ts`.
      Done: ported verbatim.

## Definition of Done
- [x] `core/` tree exists with the files above.
- [x] `pnpm test:unit -- --run src/lib/core` passes (32 new tests across the 3 files; full
      suite 434 passed).
- [x] `pnpm lint` passes for the new files (`prettier --check` + `eslint` on `src/lib/core`
      both clean). Note: bare `pnpm lint` exits non-zero from a pre-existing issue unrelated to
      this concept — prettier scans `src-tauri/target/**` build artifacts and chokes on the
      large `app_lib.lib`. Worth adding `src-tauri/target` to `.prettierignore` separately.
- [x] Self-audit: `domain/shared/*` import nothing from Tauri/Svelte; `repositories/backend/*`
      import only Tauri; no per-concept repository or service created yet.
- [x] Dashboard updated in `README.md`.

## Notes
- Do not delete the old `utils/db.ts`, `utils/time.ts`, etc. yet. The live app still uses
  them. They are removed at Cutover (Concept 09).
- `core/repositories/backend/*` are the single chokepoints to the Backend layer. If a later
  concept needs a new Tauri command, add the wrapper here, never call `invoke` from a
  per-concept repository or a service directly.
