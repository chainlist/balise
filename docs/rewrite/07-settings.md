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
- [ ] Define section types and `as const` defaults: `GeneralSettings`, `AppearanceSettings`
      (+ mesh constants), `EditorSettings`, `JournalSettings`, `MagicTagsSettings` (uses
      `MagicTagRule`), `ShortcutsSettings`, `SyncSettings`.
- [ ] `migrateLegacySettings(raw)`: pure mapping from flat legacy keys to section objects +
      keys-to-delete list.
- [ ] Any per-section validation (for example clamp font size, valid locale) as pure
      functions.

### Data Access (`core/repositories/settings.repo.ts`)
- [ ] `loadSettingsStore()` (via `core/repositories/backend/store`), `getSection`, `setSection`,
      `deleteKeys`, `save`. No defaults logic here; it just reads and writes.

### Application (`core/services/settings/`)
- [ ] Aggregator `settingsService.init()`: load store, run migration (pure mapping +
      repo writes), construct and load section services, apply locale/appearance/editor
      side effects.
- [ ] One service per section, holding `$state`, exposing setters that persist via the repo.
- [ ] Wire `settings.magicTags -> tagsService.magicRules` (closes the Concept 01 seam): on
      load and on change, set `tagsService.magicRules` to the current magic-tag rules.

### Tests (`core/domain/settings.test.ts`)
- [ ] `migrateLegacySettings`: a fixture of flat keys maps to the expected section objects
      and delete list; absent legacy keys yield a no-op result.
- [ ] Validation functions: out-of-range inputs are clamped/normalized.

## Definition of Done
- [ ] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/settings.test.ts` passes.
- [ ] `pnpm lint` passes.
- [ ] Self-audit: defaults/migration/validation are pure; the repo holds no defaults; the
      aggregator wires magic-tag rules into `tagsService`.
- [ ] Dashboard updated.

## Notes
- Editor settings feed the out-of-scope CodeMirror editor. Keep `editor.applyVars()` and
  `appearance.apply()` side effects intact (they touch the DOM, so they are app-shell
  concerns; if a setter must touch `document`, route that through the app-shell layer in
  Concept 08 rather than the section service). Record any such move.
- `setLocale` and cross-window appearance watching are app-shell side effects; keep them at
  the aggregator boundary and revisit ownership in Concept 08.
