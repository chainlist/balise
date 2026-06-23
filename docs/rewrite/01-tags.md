# Concept 01: Tags

**Goal:** rebuild tags as domain (extraction and naming rules, pure), data access
(tag.repo, owns the connection), and application (tagsService state and use cases). Tag
extraction is the richest pure logic in the app and gets thorough unit tests.

**Depends on:** 00 (shared markdown, db adapter, eventBus).

## What "tags" covers

- Tag extraction from note content: literal `#hashtags` (with positions), code-fence
  language tags, and magic tags (pattern matching driven by user settings).
- Tag display name and the `__untagged__` filter sentinel.
- Tag listing with counts, untagged count, related tags, and per-tag settings (color,
  display name, pinned).

## Old to new mapping

| Old | New layer | New file |
| --- | --- | --- |
| `models/tag.ts` (`Tag`, `RelatedTag`) | Domain | `core/domain/tag.ts` (types) |
| `utils/tag-parser.ts` (`groupHashtagOccurrences`, `TagOccurrences`) | Domain | `core/domain/tag.ts` |
| `utils/tag-constants.ts` (`SYSTEM_TAGS`) | Domain | `core/domain/tag.ts` |
| `tags.svelte.ts`: `extractCodeTags`, `extractMagicTags`, `getTagsForNote`, `extractTags`, `tagDisplayName`, `UNTAGGED_FILTER` | Domain | `core/domain/tag.ts` |
| `repositories/tags.repo.ts` | Data Access | `core/repositories/tag.repo.ts` |
| `tags.svelte.ts` class (state, `load`, `loadRelated`, `setSettings`) | Application | `core/services/tags.svelte.ts` |

## Key design decision: magic tags without a Settings dependency

`extractMagicTags` currently reads `settingsService.magicTags` directly, which would force
Tags to depend on Settings (built later). Instead make the domain function pure:

```
matchMagicTags(content: string, rules: MagicTagRule[]): string[]
```

where `MagicTagRule = { tag: string; pattern: string; matchType: MagicTagMatchType }`.
The `tagsService` holds a `magicRules` field (default `[]`). Concept 07 (Settings) wires
`settings.magicTags -> tagsService.magicRules`. Until then Tags builds and tests with an
empty rule set, which is correct (no magic tags). Define `MagicTagMatchType` and its
`as const` values in the domain so both Tags and Settings can import them.

## Todos

### Domain (pure, `core/domain/tag.ts`)
- [x] Define types: `Tag`, `RelatedTag`, `TagOccurrences`, `MagicTagRule`,
      `MagicTagMatchType` (+ `MAGIC_TAG_MATCH_TYPES` as const), `SYSTEM_TAGS` as const.
      Done: all defined in `tag.ts`; `MagicTagRule = { tag, pattern, matchType }`.
- [x] Export `UNTAGGED_FILTER` sentinel and `tagDisplayName(tag)`.
      Done.
- [x] Move `groupHashtagOccurrences` (hashtag parsing with positions) here.
      Done: with private `parseAllHashtags`/`isInsideHtmlTag` helpers and inlined
      `TAG_PATTERN_SOURCE` (old `tag-parser.ts` stays for the out-of-scope cm plugins).
- [x] Move `extractCodeTags(content)` (code-fence language tags) here.
      Done: inlined `FENCE_LANG_SOURCE` (Concept 02 Notes owns the pattern source of truth).
- [x] Add pure `matchMagicTags(content, rules)` (the regex matching, no settings import).
      Done: takes `MagicTagRule[]`, no Settings dependency.
- [x] `getTagsForNote(content, rules)` and `extractTags(content, rules)` compose the above,
      dedup case-insensitively, preserve display order.
      Done.

### Data Access (`core/repositories/tag.repo.ts`)
- [x] `tagRepo` singleton object (same shape as the example's `noteRepo`) with use-case
      methods: `withCounts()`, `untaggedCount()`, `related(tags)`, `setSettings(tag, partial)`,
      `cooccurrences()` (used by Graph, Concept 06).
      Done. Note-tag writes (`setNoteTags`/`insert`/`delete`/`resolveCanonical`) are NOT here;
      they belong to Notes (Concept 02).
- [x] Each method calls `getDb()` internally (no `Database` parameter). Map rows to the
      domain `Tag`/`RelatedTag` shape (e.g. `pinned: row.pinned === 1`) inside the repo so
      the service receives finished domain objects. SQL lives only here.
      Done: `withCounts` maps `pinned === 1`; `cooccurrences` maps snake_case rows to a
      camelCase `TagCooccurrence` (exported here; Graph/06 owns its final home).

### Application (`core/services/tags.svelte.ts`)
- [x] Singleton `tagsService` with `$state` for `tags`, `untaggedCount`, `relatedTags`, and
      `magicRules` (default `[]`).
      Done.
- [x] `load()`, `loadRelated(activeTag, composedTags)`, `setSettings(tag, partial)`:
      orchestration only. Call `tagRepo.*`; do the pinned re-sort in the service (it is app
      ordering, not persistence). No `getDb`, no SQL.
      Done: `load` assigns repo output directly (repo now returns boolean `pinned`).
- [x] Re-export domain `extractTags`/`getTagsForNote` for callers that import from the
      service today (keep the import path stable for Notes and Editor at cutover, or update
      those call sites in their own concepts).
      Done: re-exported; added `tagsForNote(content)` injecting `magicRules` (compat surface).

### Tests (`core/domain/tag.test.ts`)
- [x] Hashtag extraction: single, multiple, positions, case-insensitive dedup.
      Done.
- [x] Code-fence tags: ` ```ts ` yields `code` and `ts`; no fence yields none.
      Done.
- [x] Magic tags: `STARTS_WITH`, `ENDS_WITH`, `CONTAINS_WORD`, `CONTAINS`; empty rules yield
      none; overlapping rules dedup.
      Done.
- [x] `getTagsForNote` ordering: literal hashtags keep positions, derived tags have empty
      positions and come after.
      Done. 26 tests pass.

## Definition of Done
- [x] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/tag.test.ts` passes.
      26 tests pass (full suite: 460 passed).
- [x] `pnpm lint` passes.
      prettier `--check` + eslint clean on the four new files (bare `pnpm lint` still trips on
      the pre-existing `src-tauri/target` artifact noted in Concept 00).
- [x] Self-audit: `domain/tag.ts` imports no Svelte/Tauri/db; `tag.repo.ts` imports only
      domain + `core/repositories/backend/db`; `tags.svelte.ts` imports no SQL.
      Verified: `tag.ts` imports nothing; `tag.repo.ts` imports `./backend/db` + domain types;
      `tags.svelte.ts` imports the repo + domain only. Svelte autofixer: no issues.
- [x] Compatibility surface preserved (below).
      `tagsService.tagsForNote(content)` + re-exported `getTagsForNote`/`extractTags`.
- [x] Dashboard updated.

## Compatibility surface (for out-of-scope Editor at cutover)
The editor header consumes `getTagsForNote(content)` and `extractTags(content)`. After
cutover those will be `getTagsForNote(content, tagsService.magicRules)`. Keep a service
method (for example `tagsService.tagsForNote(content)`) that injects `magicRules` so the
editor has a no-extra-argument call site.
