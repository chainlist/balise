<script lang="ts">
	import * as m from '$paraglide/messages.js';
	import { polar, sector, SIZE, C, MAX_DOTS, GAP, DOT_STEP, RI, RO, RD, type SunburstArc } from './sunburst';
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

	const maxWeight = $derived(
		Math.max(1, ...arcs.flatMap((a) => a.relatedTags.map((r) => r.weight)))
	);

	const layout = $derived.by(() => {
		const n = arcs.length;
		if (n === 0) return [];
		const span = (Math.PI * 2 - GAP * n) / n;
		return arcs.map((arc, i) => {
			const a0 = i * (span + GAP) - Math.PI / 2 + GAP / 2;
			const a1 = a0 + span;
			const mid = (a0 + a1) / 2;
			const sorted = [...arc.relatedTags].sort((x, y) => y.weight - x.weight);
			const shown = sorted.slice(0, MAX_DOTS);
			const overflow = sorted.length - shown.length;
			const slots = shown.length + (overflow > 0 ? 1 : 0);
			// Group the dots in a short row centred above the arc, not spread across it.
			const step = DOT_STEP;
			const start = mid - ((slots - 1) * step) / 2;
			const angleAt = (k: number) => start + k * step;
			const dots = shown.map((rt, k) => {
				const [x, y] = polar(RD, angleAt(k));
				return { rt, x, y, r: 3.5 + (rt.weight / maxWeight) * 7 };
			});
			let badge: { count: number; x: number; y: number } | null = null;
			if (overflow > 0) {
				const [x, y] = polar(RD, angleAt(slots - 1));
				badge = { count: overflow, x, y };
			}
			// Tangential to the arc, flipped on the lower half so text stays upright.
			let deg = ((((mid * 180) / Math.PI + 90) % 360) + 360) % 360;
			if (deg > 90 && deg < 270) deg += 180;
			const [lx, ly] = polar((RI + RO) / 2, mid);
			return { arc, i, a0, a1, mid, dots, badge, span, label: { x: lx, y: ly, deg } };
		});
	});

	// Arc index by label, for resolving a related-tag dot to its partner arc.
	const indexByLabel = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const l of layout) map[l.arc.label] = l.i;
		return map;
	});

	// One gradient chord per co-occurring pair of shown arcs. Each end normally
	// anchors to the dot the arc renders for the other; if the partner hides this
	// tag inside its "+N" overflow badge, the chord anchors to that badge instead.
	const chords = $derived.by(() => {
		const key = (from: string, to: string) => `${from}\n${to}`;
		const dotByPair: Record<string, { x: number; y: number }> = {};
		for (const l of layout) {
			for (const d of l.dots) dotByPair[key(l.arc.label, d.rt.label)] = { x: d.x, y: d.y };
		}

		const out: {
			id: string;
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			c1: string;
			c2: string;
			w: number;
			a: number;
			b: number;
		}[] = [];
		for (const l of layout) {
			for (const d of l.dots) {
				const partner = indexByLabel[d.rt.label];
				if (partner === undefined || partner === l.i) continue;
				const pl = layout[partner];
				const back = dotByPair[key(pl.arc.label, l.arc.label)];
				let end: { x: number; y: number };
				if (back) {
					// Mutual: both arcs show each other — draw once, dot-to-dot.
					if (l.i >= partner) continue;
					end = back;
				} else {
					// One-sided: partner hides this tag in its overflow — anchor to the badge.
					if (!pl.badge) continue;
					end = { x: pl.badge.x, y: pl.badge.y };
				}
				out.push({
					id: `${Math.min(l.i, partner)}-${Math.max(l.i, partner)}`,
					x1: d.x,
					y1: d.y,
					x2: end.x,
					y2: end.y,
					c1: l.arc.color,
					c2: d.rt.color,
					w: 0.5 + (d.rt.weight / maxWeight) * 2,
					a: l.i,
					b: partner
				});
			}
		}
		return out;
	});

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
