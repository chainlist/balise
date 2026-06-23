# Concept 06: Graph

**Goal:** rebuild the tag co-occurrence graph. The graph connects **subjects (tags)**, never
note to note. Scoring, ranking, neighbor adjacency, edge weighting, colors, and layout
geometry are pure and belong in the domain. The service loads co-occurrence rows and exposes
the derived structures the views need.

**Depends on:** 01 (Tags domain, tag.repo cooccurrences, tagsService), 00.

## What "graph" covers

- Tag co-occurrence pairs from the DB.
- Jaccard weighting of edges.
- Per-tag total score, ranked tags, neighbor adjacency (sorted), filtered neighbors.
- Graph colors and the sunburst/force layout geometry (currently spread across components
  and `utils/graph-*`).

## Old to new mapping

| Old | New layer | New file |
| --- | --- | --- |
| `utils/graph-weight.ts` (`jaccardWeight`) | Domain | `core/domain/graph.ts` |
| `utils/graph-colors.ts` | Domain | `core/domain/graph.ts` |
| `graph.svelte.ts`: the `$derived` scoring/ranking/neighbor logic | Domain (pure) + Application (state) | pure builders in `core/domain/graph.ts`, `$state`/`$derived` wiring in `core/services/graph.svelte.ts` |
| `repositories/tags.repo.ts`: `queryTagCooccurrences` | Data Access | `core/repositories/tag.repo.ts` (added in Concept 01) |
| `components/graph/*` geometry helpers (arc/chord/sunburst math) | Domain | `core/domain/graph.ts` where the math is pure; keep SVG in the components |

## Key design decision
Per the project's "extract complex `$derived.by` to pure functions" convention, lift the
scoring, ranking, and adjacency builders out of the service into pure functions:

```
buildScores(tags, cooccurrences)            -> Record<lowerTag, number>
buildNeighbors(tags, cooccurrences)         -> Record<lowerTag, TagNeighbor[]>
rankTags(tags, scores)                      -> Tag[]
weightedEdges(cooccurrences)                -> Edge[]
```

The service keeps `cooccurrences` in `$state` and exposes `$derived` one-liners that call
these builders with `tagsService.tags`.

## Todos

### Domain (`core/domain/graph.ts`)
- [x] Move `jaccardWeight`. Pure. — ported verbatim from `utils/graph-weight.ts`.
- [x] Move graph color mapping. — `assignGraphColors` + `DEFAULT_TAG_COLOR` + the two
      palettes ported verbatim from `utils/graph-colors.ts`.
- [x] Add `buildScores`, `buildNeighbors`, `rankTags`, `weightedEdges`, `neighborsOf` as
      pure functions taking tags and cooccurrences. — added; `neighborsOf(neighbors, name,
      minStrength)` takes the prebuilt adjacency from `buildNeighbors` so the service stays a
      one-liner. Domain owns `TagCooccurrence` / `TagNeighbor` / `WeightedEdge` types.
- [~] Move any pure layout geometry (arc angles, sunburst slices) used by the graph
      components; leave SVG rendering in the components. — **DEFERRED to Concept 09**
      (decision 2026-06-23). The geometry (`components/graph/sunburst.ts`,
      `force-graph.ts`) is already pure and unit-tested in place; moving it now would only
      duplicate it until cutover, so it is relocated into `core/domain/graph.ts` as part of
      the graph component repoint in 09.

### Data Access
- [x] Confirm `queryTagCooccurrences` exists in `core/repositories/tag.repo.ts` (from
      Concept 01) and returns the `{ tag_a, tag_b, count, count_a, count_b }` shape. —
      exists as `tagRepo.cooccurrences()`; maps the raw row to the camelCase domain shape
      `{ tagA, tagB, count, countA, countB }`. No change needed.

### Application (`core/services/graph.svelte.ts`)
- [x] `$state cooccurrences`; `load()` reads via the repo and maps to the domain shape. —
      `load()` lazy-loads tags then assigns `await tagRepo.cooccurrences()` directly (the
      repo already returns the domain shape).
- [x] `$derived` `rankedTags`, `weightedEdges`, and a `neighborsOf(name, minStrength)`
      method, each delegating to the domain builders. — private `$derived` `scores` /
      `neighbors` feed the public `rankedTags` / `weightedEdges` `$derived` and the
      `neighborsOf` method. Compatibility surface (`load`, `rankedTags`, `weightedEdges`,
      `neighborsOf`) matches what `graph/+page.svelte` consumes.

### Tests (`core/domain/graph.test.ts`)
- [x] Port `graph-weight.test.ts` and `graph-colors.test.ts`. — ported verbatim (imports
      repointed to `./graph` and `./tag`).
- [x] `buildScores`/`rankTags`: a small fixture yields the expected order. — scores sum both
      endpoints, unconnected tags score 0, unknown rows ignored; ranking is by score then
      alphabetical tie-break.
- [x] `buildNeighbors`/`neighborsOf`: adjacency is symmetric, sorted by weight, and
      `minStrength` filters correctly. — plus case-insensitive lookup, unknown-tag empty
      list, and dropping rows whose endpoints are not known tags.

## Definition of Done
- [x] Todos ticked (geometry deferred to 09 per the decision above);
      `pnpm test:unit -- --run src/lib/core/domain/graph.test.ts` passes. — 543 passed (25 new).
- [x] `pnpm lint` passes. — prettier + eslint clean on the three new files.
- [x] Self-audit: builders are pure (no `$state`, no Svelte) and unit-tested; the service
      holds only state and `$derived` wiring; no note-to-note edges anywhere. — confirmed:
      domain imports only `./tag`; service imports domain + repo + tagsService only.
- [x] Dashboard updated.
