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
- [ ] `core/domain/theme.ts`: theme constants, `resolveTheme`, primary-color helpers (pure).
- [ ] `core/domain/shortcut.ts`: binding string parse, default + custom binding merge (pure).

### Application services
- [ ] `core/services/ui-state.svelte.ts`: the selection state that stayed after Desks moved
      out (`activeTag`, `composedTags`, `activeDay`, `activeNoteId` derivation, `graphMode`,
      `noteFolds`). Keep the `setActiveTag`/`setActiveDay`/`toggleComposedTag` use cases,
      now delegating list reloads to `notesService`/`tagsService`/`journalService`.
- [ ] `core/services/theme.svelte.ts`, `modal-state.svelte.ts`, `updater.svelte.ts`,
      `toaster.ts`, `link-preview.ts`, `active-editor.ts`: re-home, keep behavior.
- [ ] `core/services/shortcuts.svelte.ts`: registry + apply, using the domain binding logic
      and the global-shortcut OS wrapper.

### OS / Tauri wrappers (not data access)
These are OS integrations, not persistence, so they do not belong in the data-access
backend client (`repositories/backend/`). They are thin wrappers owned by the app-shell
(application) layer and live under `core/services/system/`.
- [ ] `core/services/system/tray.ts`, `global-shortcut.ts`, `updater.ts`, `link-preview.ts`:
      isolate the Tauri/`window` side effects here so the app-shell services stay
      framework-light and the OS calls have one home each.

### Bootstrap
- [ ] `core/services/app-bootstrap.ts`: port `initApp` ordering (settings, sync init,
      theme, shortcuts, ui-state, desk switch, news). `applyLanguageChange` and
      `window.location.reload` are DOM side effects: keep them in the presentation layout or
      a clearly-marked app-shell function, not in a pure service.

### Tests
- [ ] `core/domain/theme.test.ts`: `resolveTheme` for each input.
- [ ] `core/domain/shortcut.test.ts`: binding parse and default/custom merge.

## Definition of Done
- [ ] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/theme.test.ts src/lib/core/domain/shortcut.test.ts` passes.
- [ ] `pnpm lint` passes.
- [ ] Self-audit: services hold no raw Tauri/`window`/DOM calls (those are in the
      `core/services/system/` wrappers or presentation); ui-state imports notes/tags/journal
      services, and nothing imports ui-state (no cycle).
- [ ] Dashboard updated.

## Notes
- `ui-state` must not be imported by lower layers (keep it a leaf orchestrator, as today).
- This concept is a good candidate to split across two sessions if it runs long (theme +
  shortcuts + ui-state first; updater + tray + misc second). If you split, commit the first
  half and tick the relevant todos before stopping.
