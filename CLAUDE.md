### Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, vitest, tailwindcss, sveltekit-adapter, mcp

---

## App Description

**Balise** is a Tauri desktop application for managing markdown notes across multiple workspaces ("desks"). Notes are stored in a per-desk SQLite database and mirrored to the filesystem as `.md` files with YAML frontmatter. Tags are extracted from note content using `#hashtag` syntax. The app supports keyboard shortcuts, theming, and multiple desks (each with its own DB and folder).

---

## Architecture

### Stack

- **Frontend**: SvelteKit (SSR disabled, client-only), Svelte 5 runes
- **Backend**: Tauri (Rust), using plugins: `plugin-fs`, `plugin-sql`, `plugin-store`
- **Database**: SQLite via `@tauri-apps/plugin-sql`, one DB per desk
- **Styling**: Tailwind CSS + shadcn-svelte components

### Folder Structure

```
src/lib/
├── components/         # Svelte UI components
│   ├── shadcn/         # shadcn-svelte primitives — NEVER edit unless the user explicitly asks
│   ├── notes/          # Note list and editor components
│   ├── settings/       # Settings panel components
│   └── cm/             # CodeMirror editor extensions
├── repositories/       # Raw persistence access (no state, no business logic)
│   ├── notes.repo.ts      # Note SQL queries
│   ├── notes.fs.repo.ts   # Note file IO (frontmatter + {id}.md), wraps fsService
│   └── tags.repo.ts
├── services/           # Business logic and app state
│   ├── notes.svelte.ts     # Note CRUD + reactive state
│   ├── tags.svelte.ts      # Tag state and extraction
│   ├── ui-state.svelte.ts  # Global UI state (active desk, tag, note)
│   ├── theme.svelte.ts     # Theme management
│   ├── settings.svelte.ts  # User settings
│   ├── shortcuts.svelte.ts # Keyboard shortcut registry
│   ├── fs-sync.ts          # Filesystem ↔ DB sync for note files
│   ├── events/             # App-wide typed pub/sub (cross-layer events)
│   │   ├── signal.ts          # Generic Signal<T> channel primitive
│   │   └── event-bus.ts       # eventBus singleton (notes / sync / desks domains)
│   └── desk.ts             # Desk folder and DB lifecycle (no state)
└── utils/
    ├── db.ts           # DB connection singleton
    ├── migrations.ts   # Schema versioning
    ├── init-app.ts     # App bootstrap sequence
    ├── note-title.ts   # Title extraction from markdown
    └── cm/             # CodeMirror plugins (pairs, code, style, format)
```

### Component Design Conventions

- **Prefer small, single-responsibility Svelte components** that can be reused in other contexts. A component that grows past ~150 lines is a signal to split it. Each component should do one thing: render a piece of UI, manage one slice of state, or encapsulate one interaction pattern.
- Long page components that mix layout, settings panels, business logic, and sub-views are hard to maintain. Extract self-contained sections into their own components early.

### Key Conventions

- **Services are classes, utilities are plain functions.** Any module that acts as a service (has side effects, wraps other services, or is an abstraction layer) must be a class exported as a singleton (e.g. `export const fsSyncService = new FsSyncService()`). Pure utilities with no service dependencies (e.g. `desk.ts`, `notes.repo.ts`) export functions directly.
- **Repositories** are thin SQL wrappers — no business logic, no state, no Svelte reactivity.
- **Services** own business logic and reactive state (`$state` runes). They may import repositories and other services, but never create circular dependencies.
- **`ui-state`** is the top-level orchestrator: it imports `notesService`, `tagsService`, and `fsSyncService`. Nothing imports `uiState` to avoid circular deps.
- Files are stored at `~/Documents/Balise/{deskName}/{noteId}.md` with YAML frontmatter containing note metadata.
- **Singleton services don't need `destroy()`**. Services exported as module-level singletons live for the entire app lifetime. A `destroy()` method is dead code unless something in the app actually calls it. Don't add one speculatively.
- **`void` on intentional fire-and-forget promises.** When a `Promise` is deliberately not awaited (e.g. `store.set()` backed by `autoSave`), prefix with `void`. A bare floating call looks like a mistake; `void` makes the intent explicit. Example: `void this.#store?.set('theme', theme)`.
- **`as const` over `enum` for named string constants.** When values are strings used in comparisons, SQL, or serialized formats, prefer `as const` objects. They emit no JS, values are the literal strings (no runtime indirection), and they work with `Object.values()` / `keyof typeof`.
- **Cross-layer events go through `eventBus` (`services/events`).** When a low-level module must notify something across the import graph, don't import the consumer and call it directly (that risks a cycle, e.g. nothing may import `uiState`). Emit on the domain-namespaced bus (`eventBus.notes.deleted.emit(id)`) and let consumers subscribe (`eventBus.sync.synced.on(...)`). Each channel is a `Signal<T>`: a `Set`-backed pub/sub that returns its own unsubscriber from `.on()`, fires in registration order, and deduplicates identical handlers. Reach for a signal only to invert a dependency; if the reaction is something the module already legitimately depends on (a lower-level service it imports), just call it inline.
- **Extract complex `$derived.by()` blocks to pure functions.** If a `$derived.by()` block does non-trivial computation (geometry, ranking, color mapping), extract it to a named pure function in a `.ts` file. The component keeps a one-liner derived call; the logic becomes independently unit-testable.
- **Every failure must display an error or a warning message.** When an operation can fail (DB write, file IO, desk switch, update install), the user must see feedback: either a toast via `toasterService.error(title, message?)` / `toasterService.warning(title, message?)` (message is optional, pass `errorMessage(e)` when the underlying cause helps) or an inline form error for validation in dialogs. Toast titles come from paraglide messages (`m.*`), never hardcoded strings. A silent `catch` is only acceptable for intentional fallbacks (e.g. an optional resource that may not exist, or best-effort cleanup like tray removal).

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
