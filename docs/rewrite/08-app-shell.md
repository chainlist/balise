# Concept 08: App shell services

**Goal:** re-home the remaining services that are not a data concept: theme, shortcuts,
UI selection state, modal state, updater, tray, toaster, link preview, active editor, and
the app bootstrap sequence. These are application and platform concerns. Pure bits (theme
resolution, shortcut binding parse/merge) become domain; DOM and Tauri side effects stay
behind thin OS wrappers (`core/services/system/`) or the presentation layer.

**Depends on:** 00. References Desks (03), Settings (07) at the bootstrap boundary.

## What "app shell" covers

| Subsystem | Old | New home |
| --- | --- | --- |
| Theme | `services/app/theme.svelte.ts`, `utils/primary-color.ts` | domain: theme list/resolve; service: `core/services/theme.svelte.ts` |
| Shortcuts | `services/platform/shortcuts.svelte.ts`, `services/platform/global-shortcut.svelte.ts`, `services/settings/shortcuts.svelte.ts`, `config/app-shortcuts` | domain: binding parse/merge; service: `core/services/shortcuts.svelte.ts`; OS wrapper: `core/services/system/global-shortcut.ts` |
| UI selection state | `services/app/ui-state.svelte.ts` (minus desk logic moved in 03) | `core/services/ui-state.svelte.ts` (active tag, composed tags, active day, active note, graph mode, note folds) |
| Modal state | `services/app/modal-state.svelte.ts` | `core/services/modal-state.svelte.ts` |
| Updater | `services/platform/updater.svelte.ts` | `core/services/updater.svelte.ts` + OS wrapper in `core/services/system/` |
| Tray | `services/platform/tray.ts` | `core/services/system/tray.ts` (OS/Tauri side effects) |
| Toaster | `services/app/toaster.ts` | `core/services/toaster.ts` |
| Link preview | `services/platform/link-preview.ts` | `core/services/link-preview.ts` + HTTP wrapper in `core/services/system/` |
| Active editor | `services/app/active-editor.ts` | `core/services/active-editor.ts` |
| Bootstrap | `utils/init-app.ts` | `core/services/app-bootstrap.ts` (or keep in presentation layout; decide) |

## Todos

### Domain
- [x] `core/domain/theme.ts`: theme constants, `resolveTheme`, primary-color helpers (pure).
      `THEMES` + `resolveTheme(theme, prefersDark)`; the `primaryColorVars`/`PRIMARY_COLOR_VARS`
      helpers moved here from `utils/primary-color` (the core appearance section now imports them
      from the domain; the old util stays for old code until cutover).
- [x] `core/domain/shortcut.ts`: binding string parse, default + custom binding merge (pure).
      `resolveBinding(customBindings, id, defaultBinding)` + `toAccelerator(binding)`.

### Application services
- [x] `core/services/ui-state.svelte.ts`: the selection state that stayed after Desks moved
      out (`activeTag`, `composedTags`, `activeDay`, `activeNoteId` derivation, `graphMode`,
      `noteFolds`, plus `ready` and the composed `ModalState`). `setActiveTag`/`setActiveDay`/
      `toggleComposedTag` kept, delegating list reloads to `notesService`/`tagsService`. Reads
      its own `ui-state.json`; desk keys are left to `desksService` (migrated at cutover).
- [x] `core/services/theme.svelte.ts`, `modal-state.svelte.ts`, `updater.svelte.ts`,
      `toaster.ts`, `link-preview.ts`, `active-editor.ts`: re-homed, behavior kept.
- [x] `core/services/shortcuts.svelte.ts`: registry + apply. Consolidates the old
      `shortcuts.svelte.ts` (getBinding/buildTinykeysMap) and `global-shortcut.svelte.ts`
      (status/applyAll/apply/recheck), using `domain/shortcut` and the `globalShortcut` wrapper.

### OS / Tauri wrappers (not data access)
These are OS integrations, not persistence, so they do not belong in the data-access
backend client (`repositories/backend/`). They are thin wrappers owned by the app-shell
(application) layer and live under `core/services/system/`.
- [x] `core/services/system/tray.ts`, `global-shortcut.ts`, `updater.ts`, `link-preview.ts`:
      the Tauri/`window` side effects are isolated here. `global-shortcut` hides the plugin and
      the `Pressed` edge; `updater` exposes check + download-then-relaunch; `link-preview` is the
      HTTP fetch; `tray` is the whole tray (all OS side effects).

### Bootstrap
- [x] `core/services/app-bootstrap.ts`: ported `initApp` ordering (settings, sync init, theme,
      shortcuts, ui-state, `desksService.init` + `switchDesk`, news). The sync stack and
      `APP_SHORTCUTS` are still the old modules (out of scope), repointed at cutover.
      `applyLanguageChange`/`checkForNews` and `window.location.reload` live here as the
      clearly-marked app-shell composition root, not in a leaf service.

### Tests
- [x] `core/domain/theme.test.ts`: `resolveTheme` for each input (+ `primaryColorVars`).
- [x] `core/domain/shortcut.test.ts`: binding parse and default/custom merge.

## Definition of Done
- [x] Todos ticked; `pnpm exec vitest run src/lib/core/domain/theme.test.ts src/lib/core/domain/shortcut.test.ts` passes (2 files, 10 tests).
- [x] `pnpm lint` passes (scoped to the new/edited files; repo-wide lint is pre-existing-dirty).
- [x] Self-audit: all Tauri side effects are behind `core/services/system/` wrappers or in the
      bootstrap composition root; DOM is confined to the app-shell theme service (the `dark`
      class + `matchMedia`, the documented app-shell exception) and `parseOpenGraph`. ui-state
      imports notes/tags, and only `app-bootstrap` (the root) imports ui-state (no cycle).
- [x] Dashboard updated.

## Notes
- `ui-state` must not be imported by lower layers (keep it a leaf orchestrator, as today).
- This concept is a good candidate to split across two sessions if it runs long (theme +
  shortcuts + ui-state first; updater + tray + misc second). If you split, commit the first
  half and tick the relevant todos before stopping.
