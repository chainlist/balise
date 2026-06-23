# Concept 07: Settings

**Goal:** rebuild settings on the layered model. Settings are persisted in a shared
plugin-store file, grouped into sections (general, appearance, editor, journal, magic-tags,
shortcuts, sync). Defaults, validation, and the legacy-key migration are domain; the store
IO is a repository; the section services hold reactive state. This concept also closes the
seam left in Concept 01 by feeding magic-tag rules into `tagsService`.

**Depends on:** 00 (store adapter). Wires into 01 (Tags) via magic-tag rules.

## Old to new mapping

| Old | New layer | New file |
| --- | --- | --- |
| `settings/*.svelte.ts` defaults and constants (`DEFAULT_MESH_*`, `MAGIC_TAG_MATCH_TYPES`, `DEFAULT_MAGIC_TAGS`, `SYNC_INTERVAL_OPTIONS`, `MESH_MODES`) | Domain | `core/domain/settings.ts` |
| `settings.svelte.ts`: `#migrate` legacy-key mapping, `LEGACY_KEYS` | Domain | `core/domain/settings.ts` (`migrateLegacySettings(raw)` pure mapping) |
| store IO (`load`, `get`, `set`, `save`) | Data Access | `core/repositories/settings.repo.ts` (wraps `core/repositories/backend/store`) |
| `settings.svelte.ts` aggregator + each `*SettingsService` | Application | `core/services/settings/*` (aggregator + section services) |

## Key design decisions
- The magic-tag match types live in `core/domain/tag.ts` (defined in Concept 01). Settings
  imports them from there, not the reverse. `MagicTagRule` is the shared shape.
- `migrateLegacySettings(rawFlatKeys)` is a **pure** function: it takes the old flat keys
  and returns the grouped section objects plus the list of keys to delete. The repository
  performs the actual `get`/`set`/`delete`. This makes the migration unit-testable without
  a store.
- Section services keep their current shape (class per section, constructed with the store,
  `load`/setters). Only the persistence call goes through `settings.repo`, and only the
  pure bits (defaults, validation, migration mapping) move to the domain.

## Todos

### Domain (`core/domain/settings.ts`)
- [x] Define section types and `as const` defaults: `GeneralSettings`, `AppearanceSettings`
      (+ mesh constants), `EditorSettings`, `JournalSettings`, `MagicTagsSettings` (uses
      `MagicTagRule`), `ShortcutsSettings`, `SyncSettings`.
      <br>Done: all seven section interfaces + `DEFAULT_*_SETTINGS`, mesh constants, and
      `SYNC_INTERVAL_OPTIONS`. `MagicTagsSettings` reuses `MagicTagRule`/`MAGIC_TAG_MATCH_TYPES`
      imported from `./tag`. `Theme`/`MarkMode`/`DateFormat`/`Language` are mirrored as local
      string unions to keep the domain import-pure (Concept 08 can unify `Theme`).
- [x] `migrateLegacySettings(raw)`: pure mapping from flat legacy keys to section objects +
      keys-to-delete list.
      <br>Done: returns `{ sections, deleteKeys }` or `null` when no legacy key is present.
      Undefined legacy values are omitted so a section never clobbers a default on the load
      merge. `LEGACY_SETTING_KEYS` exported for the repo/tests.
- [x] Any per-section validation (for example clamp font size, valid locale) as pure
      functions.
      <br>Done: `clampFontSize`, `clampLineHeight` (with `EDITOR_FONT_SIZE`/`EDITOR_LINE_HEIGHT`
      bounds), `normalizeLanguage`, and `normalizeMagicRules` (defaults a missing `matchType`).

### Data Access (`core/repositories/settings.repo.ts`)
- [x] `loadSettingsStore()` (via `core/repositories/backend/store`), `getSection`, `setSection`,
      `deleteKeys`, `save`. No defaults logic here; it just reads and writes.
      <br>Done as `settingsRepo` (object singleton, owns the loaded `Store` at module scope like
      `backend/db`): `load`, `getSection<T>`, `setSection<T>`, `deleteKeys`, `save`, plus
      `onSectionChange` for the cross-window theme watch. `load()` wraps `loadStore('settings.json')`.

### Application (`core/services/settings/`)
- [x] Aggregator `settingsService.init()`: load store, run migration (pure mapping +
      repo writes), construct and load section services, apply locale/appearance/editor
      side effects.
      <br>Done in `settings.svelte.ts`. `#migrate` short-circuits when `appearance` exists, reads
      the legacy flat keys, calls `migrateLegacySettings`, then writes sections + deletes keys +
      flushes via the repo.
- [x] One service per section, holding `$state`, exposing setters that persist via the repo.
      <br>Done: `SettingsSection<T>` base (persist/save through `settingsRepo`) + seven sections.
      `editor`/`general` setters now run the domain clamps/`normalizeLanguage`.
- [x] Wire `settings.magicTags -> tagsService.magicRules` (closes the Concept 01 seam): on
      load and on change, set `tagsService.magicRules` to the current magic-tag rules.
      <br>Done: the magic-tags section exposes an `onRulesChange` hook the aggregator points at
      `tagsService.magicRules`; it fires on load and on `setMagicTags`. Also wired the
      `eventBus.desks.renamed/removed` seams into `sync.renameSharedDesk`/`forgetDesk`.

### Tests (`core/domain/settings.test.ts`)
- [x] `migrateLegacySettings`: a fixture of flat keys maps to the expected section objects
      and delete list; absent legacy keys yield a no-op result.
      <br>Done, incl. the undefined-omitted-but-false/null-kept case.
- [x] Validation functions: out-of-range inputs are clamped/normalized.
      <br>Done for `clampFontSize`, `clampLineHeight`, `normalizeLanguage`, `normalizeMagicRules`.
      11 tests pass.

## Definition of Done
- [x] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/settings.test.ts` passes.
      <br>`npx vitest run src/lib/core/domain/settings.test.ts` → 11 passed.
- [x] `pnpm lint` passes. <br>Prettier + ESLint clean on every new file (scoped).
- [x] Self-audit: defaults/migration/validation are pure; the repo holds no defaults; the
      aggregator wires magic-tag rules into `tagsService`.
      <br>Verified. The one sanctioned bend: appearance/editor sections still write CSS vars to
      `document` (and appearance imports `$lib/utils/primary-color`). See Notes.
- [x] Dashboard updated.

## Notes
- Editor settings feed the out-of-scope CodeMirror editor. Keep `editor.applyVars()` and
  `appearance.apply()` side effects intact (they touch the DOM, so they are app-shell
  concerns; if a setter must touch `document`, route that through the app-shell layer in
  Concept 08 rather than the section service). Record any such move.
- `setLocale` and cross-window appearance watching are app-shell side effects; keep them at
  the aggregator boundary and revisit ownership in Concept 08.

### Concept 07 outcome (recorded)
- Kept intact, to relocate in Concept 08 (flagged with `NOTE (Concept 07)` comments in the
  files): `appearance.apply*Vars()` and `editor.applyVars()` write CSS vars to `document`, and
  `appearance` imports `$lib/utils/primary-color`. These are the only places a section service
  touches the DOM / a presentation util. `setLocale` and `appearance.watchCrossWindow()` run at
  the aggregator boundary; the cross-window watch reaches the store through `settingsRepo.onSectionChange`.
- `Theme` / `MarkMode` / `DateFormat` / `Language` are mirrored as local string unions in the
  settings domain (canonical owners: app-shell theme, `utils/cm`, `utils/date-format`). They stay
  structurally assignable; Concept 08 can re-home `Theme`.
- Section classes are renamed `*SettingsSection` (was `*SettingsService`) to read as sections of
  the one settings *service*; the aggregator field names (`general`, `appearance`, …) are unchanged
  so the cutover surface stays stable.
- The store's `defaults` option (required by `StoreOptions`) is fed the section defaults via
  `DEFAULT_SETTINGS` (domain), passed by the aggregator into `settingsRepo.load(defaults)` so the
  repo still defines no defaults. Because an absent section now reads back as its default,
  `#migrate` no longer short-circuits on `appearance` being defined; the presence of a legacy flat
  key (absent from `DEFAULT_SETTINGS`) is the migration trigger, and the pure mapping returns `null`
  when none is present.
