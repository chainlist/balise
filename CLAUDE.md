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
│   ├── shadcn/         # shadcn-svelte primitives (do not edit)
│   ├── notes/          # Note list and editor components
│   ├── settings/       # Settings panel components
│   └── cm/             # CodeMirror editor extensions
├── repositories/       # Raw DB access (SQL queries only, no state)
│   ├── notes.repo.ts
│   └── tags.repo.ts
├── services/           # Business logic and app state
│   ├── notes.svelte.ts     # Note CRUD + reactive state
│   ├── tags.svelte.ts      # Tag state and extraction
│   ├── ui-state.svelte.ts  # Global UI state (active desk, tag, note)
│   ├── theme.svelte.ts     # Theme management
│   ├── settings.svelte.ts  # User settings
│   ├── shortcuts.svelte.ts # Keyboard shortcut registry
│   ├── fs-sync.ts          # Filesystem ↔ DB sync for note files
│   └── desk.ts             # Desk folder and DB lifecycle (no state)
└── utils/
    ├── db.ts           # DB connection singleton
    ├── migrations.ts   # Schema versioning
    ├── init-app.ts     # App bootstrap sequence
    ├── note-title.ts   # Title extraction from markdown
    └── cm/             # CodeMirror plugins (pairs, code, style, format)
```

### Key Conventions

- **Use a class when a module has state.** Services that hold mutable state must be implemented as a class and exported as a singleton (e.g. `export const fsSyncService = new FsSyncService()`). Plain modules with no state (e.g. `desk.ts`, `notes.repo.ts`) export functions directly.
- **Repositories** are thin SQL wrappers — no business logic, no state, no Svelte reactivity.
- **Services** own business logic and reactive state (`$state` runes). They may import repositories and other services, but never create circular dependencies.
- **`ui-state`** is the top-level orchestrator: it imports `notesService`, `tagsService`, and `fsSyncService`. Nothing imports `uiState` to avoid circular deps.
- Files are stored at `~/Documents/Balise/{deskName}/{noteId}.md` with YAML frontmatter containing note metadata.

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
