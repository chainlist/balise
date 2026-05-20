# Codebase Review

Stack: Svelte 5 · SvelteKit · Tauri · shadcn-svelte · CodeMirror · TypeScript · Tailwind v4

---

## 1. Bugs

### 1.1 `<dir>` instead of `<div>` — `Sidebar.svelte:44`
`<dir>` is a deprecated HTML element (for directory listings). This is a typo.
```svelte
<!-- wrong -->
<dir class="px-4 py-1">

<!-- correct -->
<div class="px-4 py-1">
```

### 1.2 `$props()` declared after `$effect()` — `NoteEditor.svelte`
The `$effect` on lines 28–33 references `note` (from `$props()`), but `$props()` is only declared on line 35. Rune declarations must come before any code that uses them.
```svelte
<!-- wrong order -->
$effect(() => {
    if (uiState.pendingDeleteNoteId === note.id) { ... }
});

let { note }: { note: Note } = $props();  // too late
```

### 1.3 Unawaited async in delete handler — `NoteEditor.svelte:124`
`deleteNote` is `async` but is called without `await`, so the UI dismisses before the DB delete finishes. Errors are silently swallowed.
```svelte
<!-- wrong -->
onclick={() => {
    deleteNote(note.id);
    confirmOpen = false;
}}

<!-- correct -->
onclick={async () => {
    await deleteNote(note.id);
    confirmOpen = false;
}}
```

### 1.4 Dead state `initDone` — `+layout.svelte`
`initDone` is initialized to `true` and then set to `true` again in `onMount`. It never changes value, so the derived `ready` depends only on `uiState.ready`. `initDone` is unused noise.
```ts
// wrong
let initDone = $state(true);
let ready = $derived(uiState.ready && initDone);

onMount(async () => {
    ...
    initDone = true; // no-op
});

// correct — remove initDone entirely
let ready = $derived(uiState.ready);
```

### 1.5 Typo: "Personnal" — `ui-state.svelte.ts:6`
```ts
// wrong
const defaultDesk = 'Personnal';

// correct
const defaultDesk = 'Personal';
```

---

## 2. Architecture & Design System

### 2.1 Two conflicting CSS design systems
`layout.css` uses shadcn-svelte's CSS variable convention (`--primary`, `--muted`, etc.).
`serenity.css` uses a Material Design 3 token set (`--color-primary`, `--color-surface-container-highest`, etc.) inside a `@theme` block.

Tailwind's `@theme inline` in `layout.css` maps `--color-primary: var(--primary)`, but `serenity.css` then overrides `--color-primary` directly with `#24389c`, decoupling the two systems entirely.

Result: `Sidebar.svelte` uses Material tokens (`bg-surface-container-highest`, `text-on-surface-variant`) while every other component uses shadcn tokens (`bg-muted`, `text-muted-foreground`). The sidebar has a visually distinct color palette from the rest of the UI.

**Fix:** Pick one design system. Either remove `serenity.css` and remap the sidebar to shadcn tokens, or migrate everything to the Material token set. Having both is a maintenance trap.

### 2.2 Nested `Sidebar.Provider`
`+layout.svelte` renders a top-level `<SidebarProvider>`. Then `NotesSidebar.svelte` renders its own `<Sidebar.Provider class="h-full min-h-0">` as a nested child. The shadcn sidebar context is Svelte context-based — nesting two providers shadows the outer context, which can cause unpredictable behavior with `useSidebar()`.

Either use a single provider at the layout level and configure children, or document why two providers are intentional.

### 2.3 Message-passing via shared mutable state
`uiState.pendingNoteSelection` and `uiState.pendingDeleteNoteId` are used as one-shot "send a message" flags — set in one place, read and cleared in an `$effect` in another component. This is a code smell: it makes data flow invisible, creates ordering dependencies, and is hard to trace.

A cleaner pattern is a direct callback prop or a proper event dispatch. For example, the shortcuts service could call a function exported from `notes.svelte.ts` directly instead of going through `uiState`.

### 2.4 `$effect` to sync reactive state — `NotesSidebar.svelte:28`
```svelte
$effect(() => {
    uiState.activeNoteId = selectedNoteId;
});
```
Svelte 5 docs explicitly flag this as an anti-pattern ("avoid updating state inside `$effect`"). The root cause is that `activeNoteId` lives in `uiState` but is derived from local component state. Reconsider who owns `activeNoteId` — if it's a global concern, compute it globally.

---

## 3. Svelte 5 Idiom Issues

### 3.1 Redundant type import + export — `tags.svelte.ts` and `notes.svelte.ts`
```ts
// wrong — imports and re-exports the same type twice
export type { RelatedTag } from '$lib/repositories/tags.repo';
import type { RelatedTag } from '$lib/repositories/tags.repo';

// correct — one line does both
export type { RelatedTag } from '$lib/repositories/tags.repo';
// use RelatedTag in this file via the re-export path
```
If you need the type locally, just use `import type` once.

### 3.2 Prop shorthand not used — `TagSidebarItem.svelte:20`
```svelte
<!-- verbose -->
<Sidebar.MenuButton isActive={isActive}>

<!-- idiomatic Svelte -->
<Sidebar.MenuButton {isActive}>
```

### 3.3 Inconsistent event prop naming
- `oncreate` (lowercase, DOM-style) — `NotesSidebar.svelte`
- `onselect` (lowercase) — `NotesSidebar.svelte`
- `onSettings` (PascalCase mid-word) — `Sidebar.svelte` / `TagSidebarItem.svelte`

Svelte 5 component event callbacks should follow a single convention. `on` + camelCase is the standard: `onSelect`, `onCreate`, `onSettings`.

---

## 4. Accessibility

### 4.1 `svelte-ignore` used to silence a11y — `TagSidebarItem.svelte:42-43`
```svelte
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex gap-2" onclick={handleSettingsClick}>
```
The warnings are suppressed instead of fixed. This `<div>` handles clicks but has no keyboard support and no ARIA role. Replace with a `<button type="button">`.

---

## 5. Data & SQL

### 5.1 Migrations not wrapped in transactions — `migrations.ts`
If a migration contains multiple SQL statements and one fails mid-way, the database is left in a corrupt partial state with no rollback. Each migration should run inside a transaction.

### 5.2 Dead schema in migration 1
Migration 1 creates a `note_links` table. Migration 2 drops the entire `note_tags`/`tags` tables and rebuilds them, but `note_links` is never dropped and never queried anywhere in the codebase. It's dead weight.

---

## 6. Code Smell & Readability

### 6.1 Dead `.active` CSS in `Sidebar.svelte` and `TagSidebarItem.svelte`
Both files define `.active { @apply bg-primary/...; }` inside `<style>` blocks, but this class is never applied. Active state is handled via the `isActive` prop on `<Sidebar.MenuButton>`. The dead CSS should be removed.

### 6.2 Commented-out code — `+layout.svelte:43`
```svelte
<!-- <svelte:head><link rel="icon" href={favicon} /></svelte:head> -->
```
Remove it. Git history preserves this if it's ever needed.

### 6.3 Naive note title extraction — `NotesSidebarContent.svelte:37`
```svelte
{note.content.split('\n')[0] || 'Empty note'}
```
This shows raw Markdown syntax as the note title (e.g. `### New Note`, `**bold**`). Strip common Markdown prefixes before displaying.

### 6.4 `localStorage` accessed at module evaluation time — `shortcuts.svelte.ts:12`
```ts
export const shortcutState = $state({
    customBindings: loadBindings() as Record<string, string>
});
```
`loadBindings()` calls `localStorage` when the module is first imported. If this ever runs server-side (e.g. in a test or SSR scenario), it throws. Move initialization to an `init` function pattern matching `initTheme()` and `initEditorSettings()`.

### 6.5 Very long single-line class strings — `SettingsModal.svelte:30`
```svelte
class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[85vh] max-w-275 max-h-250 bg-background rounded-xl shadow-2xl border flex overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out ..."
```
This is 200+ characters on one line. Break it across lines or extract to a `cn()` variable.

### 6.6 `TagSidebarItem.svelte` bypasses `Sidebar.MenuButton` styling contract
The component passes a full custom `class` override that replaces the button's flex layout, padding, and hover state:
```svelte
class="inline-flex w-full items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-primary/10 select-none"
```
This works but makes the component tightly coupled to implementation details of the shadcn button. If the button's defaults change, this will silently break.

### 6.7 `TagChip.svelte` uses inline `onclick` without a11y
```svelte
<span ... onclick={nav} class:cursor-pointer={navigate}>
```
A clickable `<span>` with no `role`, no `tabindex`, and no keyboard handler. Should be a `<button>` or `<a>` when `navigate` is true, a plain `<span>` otherwise.

---

## 7. Improvement Plan

### Priority 1 — Fix now (bugs, a11y, correctness)

| # | File | Action |
|---|------|--------|
| 1 | `Sidebar.svelte:44` | `<dir>` → `<div>` |
| 2 | `NoteEditor.svelte` | Move `$props()` before `$effect()`; add `await` to `deleteNote()` |
| 3 | `+layout.svelte` | Remove dead `initDone` state |
| 4 | `ui-state.svelte.ts:6` | Fix "Personnal" → "Personal" |
| 5 | `TagSidebarItem.svelte:42` | Replace `<div onclick>` with `<button type="button">`, remove svelte-ignore |
| 6 | `TagChip.svelte` | Render `<button>` when `navigate` is true |
| 7 | `migrations.ts` | Wrap each migration SQL in a transaction |

### Priority 2 — Code quality & Svelte idioms

| # | File | Action |
|---|------|--------|
| 8 | `tags.svelte.ts`, `notes.svelte.ts` | Remove redundant `import type` (keep only `export type`) |
| 9 | `TagSidebarItem.svelte:20` | `isActive={isActive}` → `{isActive}` shorthand |
| 10 | All components | Standardize event prop naming to `on` + PascalCase |
| 11 | `shortcuts.svelte.ts` | Move `loadBindings()` out of module init, call it from `initShortcuts()` |
| 12 | `NotesSidebar.svelte:28` | Reconsider `$effect` → sync `activeNoteId`. At minimum add a comment explaining why |
| 13 | `+layout.svelte:43` | Remove commented-out favicon line |
| 14 | `Sidebar.svelte`, `TagSidebarItem.svelte` | Remove dead `.active` CSS blocks |
| 15 | `migrations.ts` | Drop the `note_links` table in a new migration (or document it as planned) |
| 16 | `NotesSidebarContent.svelte:37` | Strip markdown prefixes from note title |

### Priority 3 — Architecture

| # | Area | Action |
|---|------|--------|
| 17 | CSS design system | Remove `serenity.css` or commit to it. Remap sidebar to shadcn tokens or migrate everything to MD3 tokens |
| 18 | Nested SidebarProvider | Investigate whether `NotesSidebar.svelte`'s provider shadows the root one; consolidate if possible |
| 19 | Message-passing via `uiState` | Replace `pendingNoteSelection` / `pendingDeleteNoteId` with direct callbacks or a tiny event emitter |
| 20 | `SettingsModal.svelte:30` | Break long class string across lines |

---

## Summary

The codebase is well-structured at the macro level — clean layering of repository / service / component, consistent use of Svelte 5 runes in `.svelte.ts` files, and good use of CodeMirror widget lifecycle with Svelte `mount/unmount`. The main weaknesses are:

1. **Several real bugs** (unawaited async, wrong HTML element, prop ordering) that need immediate fixes.
2. **A conflicted design system** where two token sets collide, making theming unpredictable.
3. **A few architectural patterns** (message-passing via shared state, nested providers) that will become harder to maintain as the feature set grows.
