# Balise

A Tauri desktop app for managing markdown notes across multiple workspaces ("desks"). Notes live in a per-desk SQLite database and are mirrored to disk as `.md` files with YAML frontmatter, so they stay plain files you own. Tags are extracted from note content via `#hashtag` syntax. Includes keyboard shortcuts, theming, multiple desks, and optional peer-to-peer sync between your own devices.

## Stack

- **Frontend:** SvelteKit (client-only, SSR disabled) with Svelte 5 runes
- **Desktop shell:** Tauri (Rust), using the `fs`, `sql`, and `store` plugins
- **Database:** SQLite via `@tauri-apps/plugin-sql`, one database per desk
- **Editor:** CodeMirror 6
- **Styling:** Tailwind CSS + shadcn-svelte

## Getting started

Install dependencies:

```sh
pnpm install
```

Run the desktop app in development:

```sh
pnpm tauri dev
```

To run just the frontend in a browser (no Tauri shell):

```sh
pnpm dev
```

## Scripts

- `pnpm test` runs the unit suite once (`pnpm test:unit` to watch)
- `pnpm check` type-checks with `svelte-check`
- `pnpm lint` / `pnpm format` run Prettier + ESLint
- `pnpm tauri build` produces a packaged desktop build

## Architecture

Code is layered to keep persistence, business logic, and UI separate:

- **`repositories/`** are thin SQL and file-IO wrappers with no state or business logic.
- **`services/`** own business logic and reactive state (`$state` runes), exported as singletons and grouped by domain (`content/`, `sync/`, `app/`, `settings/`, `platform/`).
- **`services/events/`** is a small typed pub/sub bus (`eventBus`) built on a `Signal<T>` primitive. Low-level producers announce events (a note deleted, a local change, a sync) and higher-level consumers subscribe. This inverts dependencies so, for example, `notesService` never has to import `uiState`.
- **`components/`** are kept small and single-responsibility.

Notes are stored at `~/Documents/Balise/{deskName}/{noteId}.md`.
