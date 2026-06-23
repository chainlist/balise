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
- [ ] Move `jaccardWeight`. Pure.
- [ ] Move graph color mapping.
- [ ] Add `buildScores`, `buildNeighbors`, `rankTags`, `weightedEdges`, `neighborsOf` as
      pure functions taking tags and cooccurrences.
- [ ] Move any pure layout geometry (arc angles, sunburst slices) used by the graph
      components; leave SVG rendering in the components.

### Data Access
- [ ] Confirm `queryTagCooccurrences` exists in `core/repositories/tag.repo.ts` (from
      Concept 01) and returns the `{ tag_a, tag_b, count, count_a, count_b }` shape.

### Application (`core/services/graph.svelte.ts`)
- [ ] `$state cooccurrences`; `load()` reads via the repo and maps to the domain shape.
- [ ] `$derived` `rankedTags`, `weightedEdges`, and a `neighborsOf(name, minStrength)`
      method, each delegating to the domain builders.

### Tests (`core/domain/graph.test.ts`)
- [ ] Port `graph-weight.test.ts` and `graph-colors.test.ts`.
- [ ] `buildScores`/`rankTags`: a small fixture yields the expected order.
- [ ] `buildNeighbors`/`neighborsOf`: adjacency is symmetric, sorted by weight, and
      `minStrength` filters correctly.

## Definition of Done
- [ ] Todos ticked; `pnpm test:unit -- --run src/lib/core/domain/graph.test.ts` passes.
- [ ] `pnpm lint` passes.
- [ ] Self-audit: builders are pure (no `$state`, no Svelte) and unit-tested; the service
      holds only state and `$derived` wiring; no note-to-note edges anywhere.
- [ ] Dashboard updated.
