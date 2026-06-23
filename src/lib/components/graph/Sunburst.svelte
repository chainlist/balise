<script lang="ts">
	import * as m from '$paraglide/messages.js';
	import { sector, buildChords, buildLayout, SIZE, C, RI, RO, type SunburstArc } from '$lib/domain/graph';
	import Arc from './Arc.svelte';
	import RelatedDot from './RelatedDot.svelte';
	import OverflowBadge from './OverflowBadge.svelte';
	import Chord from './Chord.svelte';
	import Center from './Center.svelte';
	import Tooltip from './Tooltip.svelte';

	let {
		centerLabel,
		fallbackLabel = 'Balise',
		arcs,
		onArcClick,
		onCenterClick
	}: {
		centerLabel: string | null;
		fallbackLabel?: string;
		arcs: SunburstArc[];
		onArcClick?: (label: string) => void;
		onCenterClick?: () => void;
	} = $props();

	type Hover =
		| { type: 'arc'; i: number }
		| { type: 'dot'; i: number; j: number }
		| { type: 'badge'; i: number }
		| null;

	let hover = $state<Hover>(null);
	let mouse = $state({ x: 0, y: 0 });
	let wrapW = $state(0);

	// Strongest connection in view, used to scale dots/chords relative to it.
	// Falls back to 1 when there are no related tags (avoids a divide-by-zero);
	// no floor of 1 on real weights, since Jaccard strengths are all <= 1.
	const maxWeight = $derived(
		arcs.flatMap((a) => a.relatedTags.map((r) => r.weight)).reduce((mx, w) => Math.max(mx, w), 0) ||
			1
	);

	const layout = $derived(buildLayout(arcs, maxWeight));

	// Arc index by label, for resolving a related-tag dot to its partner arc.
	const indexByLabel = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const l of layout) map[l.arc.label] = l.i;
		return map;
	});

	// One gradient chord per co-occurring pair of shown arcs. Logic lives in sunburst.ts.
	const chords = $derived(buildChords(layout, indexByLabel, maxWeight));

	// What the pointer is emphasising: a whole arc (with all its chords) or, when
	// hovering a single dot, just that dot's chord and the two arcs it links.
	type Focus = { kind: 'arc'; i: number } | { kind: 'chord'; a: number; b: number } | null;

	const focus = $derived.by<Focus>(() => {
		if (!hover) return null;
		if (hover.type === 'dot') {
			const d = layout[hover.i]?.dots[hover.j];
			const partner = d ? indexByLabel[d.rt.label] : undefined;
			// b = -1 when the dot's tag isn't a shown arc (no chord to highlight).
			return { kind: 'chord', a: hover.i, b: partner ?? -1 };
		}
		return { kind: 'arc', i: hover.i };
	});

	// Arcs connected to each arc by a chord, for arc-hover highlighting.
	const adjacency = $derived.by(() => {
		const adj: Record<number, number[]> = {};
		for (const c of chords) {
			(adj[c.a] ??= []).push(c.b);
			(adj[c.b] ??= []).push(c.a);
		}
		return adj;
	});

	function arcOp(i: number): number {
		if (focus === null) return 1;
		if (focus.kind === 'chord') return i === focus.a || i === focus.b ? 1 : 0.22;
		return i === focus.i || adjacency[focus.i]?.includes(i) ? 1 : 0.22;
	}

	function chordOp(c: { a: number; b: number }): number {
		if (focus === null) return 0.08;
		if (focus.kind === 'chord') {
			const hit = (c.a === focus.a && c.b === focus.b) || (c.a === focus.b && c.b === focus.a);
			return hit ? 0.85 : 0.04;
		}
		return c.a === focus.i || c.b === focus.i ? 0.85 : 0.04;
	}

	const tip = $derived.by(() => {
		if (!hover) return null;
		const l = layout[hover.i];
		if (!l) return null;
		if (hover.type === 'dot') {
			const d = l.dots[hover.j];
			if (!d) return null;
			return { title: d.rt.label, sub: m.graph_dot_common({ count: d.rt.weight }) };
		}
		if (hover.type === 'badge') {
			return {
				title: m.graph_badge_more({ count: l.badge?.count ?? 0 }),
				sub: m.graph_badge_hint()
			};
		}
		return null; // arcs highlight on hover but show no tooltip
	});

	// Radial mask that dims chords where they cross the arc ring, so dense
	// chord bundles don't clutter the arcs. White = visible, dark = ~faded.
	const ringMask = [
		{ o: 0, c: '#fff' },
		{ o: (RI - 12) / C, c: '#fff' },
		{ o: (RI + 2) / C, c: '#191919' },
		{ o: (RO - 2) / C, c: '#191919' },
		{ o: (RO + 12) / C, c: '#fff' }
	];

	const tipX = $derived(Math.max(8, Math.min(mouse.x + 14, wrapW - 232)));
	const tipY = $derived(Math.max(4, mouse.y - 36));

	function handleMove(e: MouseEvent) {
		const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
		wrapW = r.width;
	}

	function arcKey(e: KeyboardEvent, label: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onArcClick?.(label);
		}
	}

	function centerKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onCenterClick?.();
		}
	}
</script>

<div class="relative h-full w-full">
	<svg
		viewBox="0 0 {SIZE} {SIZE}"
		preserveAspectRatio="xMidYMid meet"
		class="block h-full w-full"
		role="img"
		aria-label={centerLabel ?? fallbackLabel}
		onmousemove={handleMove}
		onmouseleave={() => (hover = null)}
	>
		<defs>
			<radialGradient id="sb-ring-mask-grad" gradientUnits="userSpaceOnUse" cx={C} cy={C} r={C}>
				{#each ringMask as s (s.o)}
					<stop offset="{s.o * 100}%" stop-color={s.c} />
				{/each}
			</radialGradient>
			<mask id="sb-ring-mask">
				<rect x="0" y="0" width={SIZE} height={SIZE} fill="url(#sb-ring-mask-grad)" />
			</mask>
		</defs>

		<!-- Chords (bezier through the center), dimmed where they cross the arc ring -->
		<g mask="url(#sb-ring-mask)">
			{#each chords as c (c.id)}
				<Chord
					id={c.id}
					x1={c.x1}
					y1={c.y1}
					x2={c.x2}
					y2={c.y2}
					c1={c.c1}
					c2={c.c2}
					w={c.w}
					opacity={chordOp(c)}
				/>
			{/each}
		</g>

		<!-- Arcs -->
		{#each layout as l (l.arc.label)}
			<Arc
				path={sector(l.a0, l.a1)}
				color={l.arc.color}
				isSelected={l.arc.isSelected}
				label={l.arc.label}
				noteCount={l.arc.noteCount}
				labelPos={l.label}
				op={arcOp(l.i)}
				onenter={() => (hover = { type: 'arc', i: l.i })}
				onleave={() => (hover = null)}
				onclick={() => onArcClick?.(l.arc.label)}
				onkeydown={(e) => arcKey(e, l.arc.label)}
			/>
		{/each}

		<!-- Related dots -->
		{#each layout as l (l.arc.label)}
			{@const op = arcOp(l.i)}
			{#each l.dots as d, j (d.rt.label)}
				<RelatedDot
					cx={d.x}
					cy={d.y}
					r={d.r}
					color={d.rt.color}
					{op}
					arcLabel={l.arc.label}
					tagLabel={d.rt.label}
					onenter={() => (hover = { type: 'dot', i: l.i, j })}
					onleave={() => (hover = null)}
				/>
			{/each}
			{#if l.badge}
				<OverflowBadge
					x={l.badge.x}
					y={l.badge.y}
					count={l.badge.count}
					{op}
					label={m.graph_badge_more({ count: l.badge.count })}
					onenter={() => (hover = { type: 'badge', i: l.i })}
					onleave={() => (hover = null)}
				/>
			{/if}
		{/each}

		<!-- Center: shows the selected tag (or the desk name); click opens its notes. -->
		<Center {centerLabel} {fallbackLabel} onclick={() => onCenterClick?.()} onkeydown={centerKey} />
	</svg>

	{#if tip}
		<Tooltip title={tip.title} sub={tip.sub} x={tipX} y={tipY} />
	{/if}
</div>
