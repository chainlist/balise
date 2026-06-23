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

The code follows a five-layer architecture with a one-way dependency flow:
**Presentation → Application (services) → Domain → Data Access (repositories) → Backend**.
A layer may only import from layers below it. See `docs/rewrite/README.md` for the full
import matrix.

```
src/lib/
├── components/         # Presentation: Svelte UI (DOM, CSS) — imports services + domain types only
│   ├── shadcn/         # shadcn-svelte primitives — NEVER edit unless the user explicitly asks
│   ├── sidebar/        # Notes panel, tags card, tag filter, desk sheets
│   ├── notes/          # Note editor host, preview, dialogs
│   ├── settings/       # Settings panel components
│   ├── graph/          # Subject graph (sunburst, force, chord) — d3/canvas render only
│   ├── tasks/          # Task board
│   └── cm/             # CodeMirror editor components (out of scope — not re-layered)
├── domain/             # Layer 3: pure business rules — no I/O, no Svelte, no Tauri
│   ├── note.ts            # Note aggregate (class, static create/fromRow); derives tags/title/preview
│   ├── tag.ts             # Tag rules, hashtag parsing, display names
│   ├── desk.ts            # Desk aggregate + name/removal rules
│   ├── task.ts · graph.ts · journal.ts · settings.ts · theme.ts · shortcut.ts · datetime.ts
│   └── shared/            # id · markdown · time primitives
├── repositories/       # Layer 4: data access — speaks domain objects, owns the DB connection; SQL lives ONLY here
│   ├── note.repo.ts       # Note persistence (SQL + file IO), singleton object
│   ├── tag.repo.ts · desk.repo.ts · settings.repo.ts
│   └── backend/           # Backend client — the ONLY place Tauri is touched
│       ├── db.ts             # plugin-sql connection (singleton)
│       ├── fs.ts             # plugin-fs adapter
│       ├── store.ts          # plugin-store adapter
│       └── tauri.ts          # invoke() wrappers
├── services/           # Layer 2: use-case sequencers + reactive $state — singletons, no SQL/DOM/Tauri
│   ├── notes · tags · desks · tasks · journal · graph · theme · shortcuts · updater (.svelte.ts)
│   ├── ui-state.svelte.ts  # Top-level orchestrator (active desk/tag/note); NOTHING imports it
│   ├── app-bootstrap.ts · quick-bootstrap.ts  # Composition roots (main + quick-capture window)
│   ├── assets.ts · active-editor.ts · link-preview.ts · toaster.ts · modal-state.svelte.ts
│   ├── settings/           # Settings sub-services split by domain (appearance, editor, sync, …)
│   ├── events/             # App-wide typed pub/sub: signal.ts (Signal<T>) + event-bus.ts (eventBus singleton)
│   ├── system/             # OS seams: tray, global-shortcut, updater, link-preview
│   └── sync/               # P2P sync subsystem (out of scope — not re-layered)
└── utils/                  # Shared helpers + out-of-scope subsystems (not part of the layering)
    ├── cm/                 # CodeMirror plugins (out of scope — not re-layered)
    ├── color-palette.ts · markdown-patterns.ts · note-utils.ts  # genuinely-shared pure helpers
    └── device-id.ts · sync.ts                                   # used by the sync subsystem
```

### Component Design Conventions

- **Prefer small, single-responsibility Svelte components** that can be reused in other contexts. A component that grows past ~150 lines is a signal to split it. Each component should do one thing: render a piece of UI, manage one slice of state, or encapsulate one interaction pattern.
- Long page components that mix layout, settings panels, business logic, and sub-views are hard to maintain. Extract self-contained sections into their own components early.

### Key Conventions

- **Singletons hold state; the domain holds rules; pure helpers are plain functions.** Services and repositories are exported as singletons — a singleton object (`export const noteRepo = { … }`) or a class instance (`export const fsSyncService = new FsSyncService()`). Domain aggregates with identity/lifecycle (Note, Desk) are classes with a `static create()` factory; stateless domain rules and shared utilities export functions directly (e.g. `domain/tag.ts`, `utils/note-utils.ts`).
- **Domain is pure.** Rules and config are passed in — no I/O, no Svelte, no Tauri. A concept's aggregate validates and derives in its factory; everything above it trusts the result.
- **Repositories speak domain objects and own the connection.** They map domain objects to rows/files and back, reaching the backend client internally. SQL lives **only** in repositories; services never see a `Database`. No business logic, no state, no Svelte reactivity.
- **Services sequence, they do not compute.** A use case is a thin ordered list of steps (build the domain object, call the repo, update state). They own reactive `$state` (runes) and may import repositories and other services, but never create circular dependencies.
- **`ui-state`** is the top-level orchestrator: it imports `notesService`, `tagsService`, and `eventBus`. Nothing imports `uiState` to avoid circular deps.
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
