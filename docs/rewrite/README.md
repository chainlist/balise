# Balise Layered Rewrite: Master Plan

This is the master plan for rebuilding Balise on a clean, layered architecture. It is
designed to be executed **one concept at a time, across multiple sessions**. Read this
file first, then open the concept file you are working on.

> Status legend: `[ ]` not started, `[~]` in progress, `[x]` done (tests included, committed).

---

## 1. Why

The current code mixes layers: services call `getDB()` and pass the SQLite handle into
repositories (SQL leaks into the application layer), repositories derive business values
like note title and preview (domain logic in data access), and pure rules are scattered
across `utils/` and inlined inside services. There is no dedicated domain layer.

We are rebuilding it so every file sits in exactly one of five layers, with a one-way
dependency flow.

## 2. The five layers

These are exactly your five layers. There is no extra "platform" layer: the modules that
touch Tauri (the db connection client, the filesystem adapter, the store adapter, and the
`invoke` wrappers) are the **data-access layer's backend client**, that is, how the
repository reaches the Backend. They live under `core/repositories/backend/` and are an
implementation detail of Data Access, not a layer of their own.

```
Presentation   (Svelte components, CSS, DOM)          *.svelte, src/routes
   |  calls
Application    (services: use-case steps, app state)  lib/services/<concept>.ts
   |  calls                                            no SQL, no DOM, no Tauri import
Domain         (pure business rules)                  lib/domain/<concept>.ts
                                                       no I/O, no framework, no Svelte
Data Access    (repositories: hide WHERE data lives)  lib/repositories/<concept>.repo.ts
   |  uses                                             speaks domain objects; the backend
   |                                                   client (db/fs/store/invoke) lives here
Backend        (Tauri: plugin-sql, plugin-fs,         reached only through the data-access
                plugin-store, Rust commands)          backend client; never from a service
```

### The call path (one line)

```
+page.svelte  ->  createNote()  ->  Note.create()  ->  noteRepo.save(note)  ->  save_note (Rust, deferred)
 presentation     application       domain            data access            backend
   "click"         "the steps"       "the rules"       "hide the DB"          "actually write it"
```

Presentation speaks DOM and clicks; application sequences the use case; domain holds the
rules (validate, derive tags/title/preview); data access hides that persistence is
`plugin-sql` today (and `invoke` to Rust to SQLite later); the backend does the actual write.

### Allowed imports (one-way, top calls down only)

| Layer | May import | Must NOT import |
| --- | --- | --- |
| Presentation | services, domain types, components, paraglide messages | repositories, the backend client, raw SQL, `getDb` |
| Application (services) | domain, repositories, other services, eventBus, paraglide | SQL strings, `Database`, DOM/`window`, Tauri APIs directly, components |
| Domain | other domain modules only | Svelte/`$state`, Tauri, db, repositories, services, components, any I/O |
| Data Access (repositories) | domain, the backend client | services, components, Svelte state, business rules |
| Backend client (`repositories/backend/*`) | Tauri plugins/APIs only | domain, services, business rules |

### The four rules that change the most code

1. **The domain builds and validates; everything above it trusts the result.** A concept's
   aggregate has a factory that applies the rules. `Note.create(content, magicRules)`
   validates and derives tags, title, and preview, then returns a `Note`. `Note.fromRow(row)`
   rebuilds one from storage. The domain is pure: rules and config are passed in, no I/O, no
   Svelte, no Tauri. Stateless rules that are not an aggregate (tag-extraction internals,
   graph math, task parsing) stay as pure functions the aggregate calls. Use a class for a
   concept with identity and lifecycle (Note, Desk); plain functions for the rest.
2. **Services sequence, they do not compute.** A use case is a thin ordered list of steps:
   build the domain object, call the repo, update state, return. No rules, no SQL, no DOM.
   `createNote` is `Note.create()` then `noteRepo.save(note)` then update the list. The only
   reason a Balise service is a singleton object rather than a free function (as in the
   reference example) is that it must hold Svelte `$state`, which needs a stable holder; the
   methods stay just as thin.
3. **Repositories speak domain objects and own the connection.** `noteRepo.save(note)`,
   `noteRepo.findAll(): Note[]`. The repo maps the `Note` to rows and files and back; it does
   no business logic. It reaches the backend client internally (`getDb()` is behind the
   data-access layer); services never see a `Database` or pass one around. **SQL lives only
   in the repository**, never above it.
4. **Repository methods are use-case-grained and batch-ready.** One method per use case, not
   one per low-level op: "create a note" is a single `noteRepo.save(note)`, not `insert` +
   `setTags` + `writeFile` sequenced by the service. Today the body uses `plugin-sql`/
   `plugin-fs`; the deferred Rust plan replaces that body with one
   `invoke('save_note', { note })` into a transactional Tauri command, **with no change above
   the repository**.

## 3. Strategy: greenfield, parallel, cut over at the end

We build the new stack alongside the old one. The live app keeps running on the old code
until the final cutover, so every concept commit is safe.

- New framework-agnostic code goes under **`src/lib/core/`**:
  - `src/lib/core/domain/` (Layer 3)
  - `src/lib/core/repositories/` (Layer 4), with `src/lib/core/repositories/backend/` holding
    the backend client (db connection, fs, store, Tauri invoke wrappers)
  - `src/lib/core/services/` (Layer 2)
- Presentation (`src/lib/components`, `src/routes`) keeps importing the **old** services
  during construction. Nothing in the live UI is repointed until Concept 09 (Cutover).
- New unit tests live next to the new files (`*.test.ts`).

This means Concepts 00 to 08 are purely additive: they create and test new `core/` code
without touching the running app. Concept 09 repoints the UI, deletes the old code, and
flattens `core/*` up into `lib/` so the final tree matches the layer paths in section 2
(`lib/domain`, `lib/repositories`, `lib/services`). If you prefer to keep the `core/`
prefix permanently, that is a valid override; decide at Concept 09.

### Out of scope for this plan

The **CodeMirror editor** (`utils/cm/*`, `components/cm/*`, `components/notes/Editor*`)
and **P2P sync** (`services/sync/*`, `fs-sync`, `device-sync`, iroh) are left functionally
intact. They are not re-layered here. At Cutover they are repointed to the new Notes and
Tags services through a thin adapter, nothing more. Each in-scope concept lists the
**compatibility surface** (the API the new code must keep exposing) so Editor and Sync keep
working after cutover. A separate future plan can re-layer Editor and Sync.

### Deferred: Rust-side batched persistence

Decision (2026-06-23): in this rewrite, I/O stays on the TS side via `plugin-sql`/`plugin-fs`,
but every repository method is use-case-grained and batch-ready (rule 3 above). Moving the
multi-step write paths into single transactional Rust/Tauri commands (to cut IPC round-trips
and get atomicity) is a **deferred follow-up plan**, like Editor and Sync. Because the
data-access boundary hides the Backend, that move is a localized swap behind the repository
interfaces and changes nothing in the domain, application, or presentation layers. Keep the
domain in TS: a future Rust command must receive already-computed data (row fields, tag list,
file text), never raw markdown, so the parsers are not duplicated in Rust.

## 4. Concepts, in dependency order

| # | Concept | Depends on | File |
| --- | --- | --- | --- |
| 00 | Foundation and conventions | none | [00-foundation.md](00-foundation.md) |
| 01 | Tags | 00 | [01-tags.md](01-tags.md) |
| 02 | Notes | 00, 01 | [02-notes.md](02-notes.md) |
| 03 | Desks | 00 | [03-desks.md](03-desks.md) |
| 04 | Journal | 02 | [04-journal.md](04-journal.md) |
| 05 | Tasks | 02 | [05-tasks.md](05-tasks.md) |
| 06 | Graph | 01 | [06-graph.md](06-graph.md) |
| 07 | Settings | 00 (seam into 01) | [07-settings.md](07-settings.md) |
| 08 | App shell services | 00 | [08-app-shell.md](08-app-shell.md) |
| 09 | Pages and components cutover | all above | [09-cutover.md](09-cutover.md) |

## 5. Progress dashboard

- [x] 00 Foundation and conventions
- [x] 01 Tags
- [x] 02 Notes
- [x] 03 Desks
- [ ] 04 Journal
- [ ] 05 Tasks
- [ ] 06 Graph
- [ ] 07 Settings
- [ ] 08 App shell services
- [ ] 09 Pages and components cutover

## 6. Workflow (how to run this across sessions)

One concept per session. Inside a session:

1. Open this README, then open the concept file.
2. Work the todos top to bottom. **After each todo**, tick its box in the concept file and
   add a one-line note of what changed or what you verified.
3. Keep each layer pure per the import matrix in section 2. If a piece of logic does not
   fit the layer you are in, it belongs in a different layer; move it.
4. When all todos in the concept are ticked, run the concept's **Definition of Done**.
5. Tick the concept in the section 5 dashboard, then **stop and ask the user to commit**.
6. Start the next concept in a fresh session to keep context small.

### Definition of Done (every concept)

- [ ] All concept todos ticked.
- [ ] New domain functions have unit tests; `pnpm test:unit -- --run <new test files>` passes.
- [ ] `pnpm lint` passes for new files.
- [ ] Layer self-audit: open each new file and confirm its imports obey the matrix.
- [ ] Compatibility surface (if any) is preserved.
- [ ] Dashboard updated.

### Verification commands

- Unit tests: `pnpm test:unit -- --run <path/to/file.test.ts>`
- Lint: `pnpm lint` (or `pnpm format` to fix)
- Type-checking and building are the user's responsibility. Do **not** run `pnpm build`,
  `vite build`, or `tsc --noEmit`. `pnpm check` (svelte-check) is optional and user-run.

### Commit protocol

The agent never commits automatically. When a concept is done, the agent stops and asks
the user to commit. Suggested message shape: `refactor(<concept>): rebuild <concept> on
layered architecture`.

## 7. Conventions carried over from the project

- Services are singleton objects whose methods are thin sequencers; they hold reactive
  `$state` but contain no rules and no SQL.
- Domain aggregates (Note, Desk) are classes with a `static create()` factory that validates
  and derives; stateless domain rules are pure functions.
- Reactive state uses Svelte 5 runes in `.svelte.ts` service files.
- `as const` objects over `enum` for string constants.
- `void` prefix on intentional fire-and-forget promises.
- Cross-layer notifications go through `eventBus` (`core/services/events`), never by
  importing the consumer.
- Every failure surfaces a toast (`toasterService.error/warning`, title from `m.*`) or an
  inline form error. Silent catch only for intentional fallbacks.
- The graph connects subjects (tags), never note to note.
