<script lang="ts">
	import { onMount } from 'svelte';
	import type { Tag } from '$lib/models/tag';
	import type { TagCooccurrence } from '$lib/services/tags.svelte';
	import { tagDisplayName } from '$lib/services/tags.svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ChevronUpIcon, SettingsIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	type Mode = 'hidden' | 'faint' | 'split';
	type Hover = { type: 'tag'; i: number } | { type: 'dot'; i: number } | null;
	type Hit =
		| { type: 'tag'; i: number; sa: number; ea: number; r1: number; r2: number }
		| { type: 'dot'; i: number; partner: number; x: number; y: number; r: number };
	type Item = { a: number; b: number; count: number };
	type Dot = { ni: number; arc: number; partner: number; na: number; x: number; y: number };

	let {
		tags,
		cooccurrences,
		onSelectTag
	}: {
		tags: Tag[];
		cooccurrences: TagCooccurrence[];
		onSelectTag: (tag: string) => void;
	} = $props();

	const DEFAULT_TAG_COLOR = '#7F77DD';
	const PALETTE_LIGHT = [
		'#7F77DD',
		'#1D9E75',
		'#D85A30',
		'#378ADD',
		'#9333EA',
		'#E0A30E',
		'#D6336C',
		'#0CA678'
	];
	const PALETTE_DARK = [
		'#AFA9EC',
		'#5DCAA5',
		'#F0997B',
		'#85B7EB',
		'#C084FC',
		'#F5CF5B',
		'#F06595',
		'#38D9A9'
	];

	let canvasEl = $state<HTMLCanvasElement>();
	let wrapEl = $state<HTMLDivElement>();
	let mode = $state<Mode>('faint');
	let isDark = $state(false);
	let settingsOpen = $state(false);
	let minCooccurrence = $state(1);
	let tip = $state<{ x: number; y: number; title: string; sub: string } | null>(null);

	// Non-reactive drawing locals
	let ctx: CanvasRenderingContext2D | null = null;
	let W = 0;
	let H = 0;
	let CX = 0;
	let CY = 0;
	let hov: Hover = null;
	let hits: Hit[] = [];

	const colors = $derived(
		tags.map((t, i) => {
			if (t.color && t.color.toUpperCase() !== DEFAULT_TAG_COLOR) return t.color;
			return (isDark ? PALETTE_DARK : PALETTE_LIGHT)[i % PALETTE_LIGHT.length];
		})
	);

	const maxCount = $derived(cooccurrences.reduce((mx, c) => Math.max(mx, c.count), 1));

	const items = $derived.by(() => {
		const idx: Record<string, number> = {};
		tags.forEach((t, i) => (idx[t.tag.toLowerCase()] = i));
		const result: Item[] = [];
		for (const c of cooccurrences) {
			if (c.count < minCooccurrence) continue;
			const a = idx[c.a.toLowerCase()];
			const b = idx[c.b.toLowerCase()];
			if (a === undefined || b === undefined || a === b) continue;
			result.push({ a, b, count: c.count });
		}
		return result;
	});

	function ra(hex: string, op: number): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${op})`;
	}

	function dotState(ni: number): 'normal' | 'active' | 'related' | 'dim' {
		if (!hov) return 'normal';
		if (hov.type === 'dot' && hov.i === ni) return 'active';
		if (hov.type === 'tag' && (items[ni].a === hov.i || items[ni].b === hov.i)) return 'related';
		return 'dim';
	}

	function tagState(ti: number): 'normal' | 'active' | 'related' | 'dim' {
		if (!hov) return 'normal';
		if (hov.type === 'tag' && hov.i === ti) return 'active';
		if (hov.type === 'dot' && (items[hov.i].a === ti || items[hov.i].b === ti)) return 'related';
		return 'dim';
	}

	function draw() {
		if (!ctx || tags.length === 0) return;
		ctx.clearRect(0, 0, W, H);
		const r0 = 30;
		const r1 = 66;
		const r2 = 106;
		const r3 = 150;
		const n = tags.length;
		const gap = 0.05;
		const arc = (Math.PI * 2 - gap * n) / n;
		hits = [];

		// One dot per (item, arc): under each tag arc, a dot for every co-occurring partner tag.
		const perArc: Record<number, { ni: number; partner: number }[]> = {};
		items.forEach((it, ni) => {
			(perArc[it.a] ??= []).push({ ni, partner: it.b });
			(perArc[it.b] ??= []).push({ ni, partner: it.a });
		});

		const dots: Dot[] = [];
		const dotsByItem: Record<number, Dot[]> = {};
		tags.forEach((_, ti) => {
			const ast = ti * (arc + gap) - Math.PI / 2 + gap / 2;
			const list = perArc[ti] ?? [];
			list.forEach((entry, k) => {
				const na = ast + ((k + 0.5) / list.length) * arc;
				const x = CX + Math.cos(na) * r3;
				const y = CY + Math.sin(na) * r3;
				const d: Dot = { ni: entry.ni, arc: ti, partner: entry.partner, na, x, y };
				dots.push(d);
				(dotsByItem[entry.ni] ??= []).push(d);
			});
		});

		// Chords: link the two dots of each co-occurrence pair through the center.
		items.forEach((it, ni) => {
			const pos = dotsByItem[ni];
			if (!pos || pos.length < 2) return;
			const ds = dotState(ni);
			let ca: number;
			if (mode === 'hidden' || mode === 'split') ca = ds === 'active' ? 0.55 : 0;
			else ca = ds === 'active' ? 0.55 : ds === 'related' ? 0.2 : 0.09;
			if (ca < 0.01) return;
			const p1 = pos[0];
			const p2 = pos[1];
			ctx!.beginPath();
			ctx!.moveTo(p1.x, p1.y);
			ctx!.bezierCurveTo(
				CX + Math.cos(p1.na) * r0 * 0.35,
				CY + Math.sin(p1.na) * r0 * 0.35,
				CX + Math.cos(p2.na) * r0 * 0.35,
				CY + Math.sin(p2.na) * r0 * 0.35,
				p2.x,
				p2.y
			);
			ctx!.strokeStyle = ra(colors[it.a], ca);
			ctx!.lineWidth = ds === 'active' ? 1.5 : 0.8;
			ctx!.stroke();
		});

		// Spokes: connect each dot to its tag arc.
		dots.forEach((d) => {
			const ts = tagState(d.arc);
			const ds = dotState(d.ni);
			const bright = ds === 'active' || ts === 'active';
			const dim = ts === 'dim' && ds === 'dim';
			let sa: number;
			if (mode === 'hidden') sa = bright ? 0.45 : 0;
			else if (mode === 'faint') sa = bright ? 0.45 : dim ? 0.04 : 0.11;
			else sa = dim ? 0.04 : 0.11;
			if (sa < 0.01) return;
			ctx!.beginPath();
			ctx!.moveTo(CX + Math.cos(d.na) * r2, CY + Math.sin(d.na) * r2);
			ctx!.lineTo(d.x, d.y);
			ctx!.strokeStyle = ra(colors[d.arc], sa);
			ctx!.lineWidth = 0.7;
			ctx!.stroke();
		});

		// Tag arcs
		tags.forEach((tag, i) => {
			const ast = i * (arc + gap) - Math.PI / 2 + gap / 2;
			const aen = ast + arc;
			const mid = (ast + aen) / 2;
			const ts = tagState(i);
			const fa = { normal: 0.1, active: 0.21, related: 0.14, dim: 0.04 }[ts];
			const sa = { normal: 0.36, active: 0.78, related: 0.6, dim: 0.14 }[ts];
			const lw = { normal: 0.8, active: 1.5, related: 1.2, dim: 0.5 }[ts];
			ctx!.beginPath();
			ctx!.arc(CX, CY, r2, ast, aen);
			ctx!.arc(CX, CY, r1, aen, ast, true);
			ctx!.closePath();
			ctx!.fillStyle = ra(colors[i], fa);
			ctx!.fill();
			ctx!.strokeStyle = ra(colors[i], sa);
			ctx!.lineWidth = lw;
			ctx!.stroke();
			// Label
			const lx = CX + (Math.cos(mid) * (r1 + r2)) / 2;
			const ly = CY + (Math.sin(mid) * (r1 + r2)) / 2;
			ctx!.save();
			ctx!.translate(lx, ly);
			ctx!.rotate(mid + Math.PI / 2);
			ctx!.font = '500 10px monospace';
			ctx!.fillStyle = ra(colors[i], { normal: 0.8, active: 1, related: 0.95, dim: 0.35 }[ts]);
			ctx!.textAlign = 'center';
			ctx!.textBaseline = 'middle';
			ctx!.fillText(tagDisplayName(tag), 0, 0);
			ctx!.restore();
			hits.push({ type: 'tag', i, sa: ast, ea: aen, r1, r2 });
		});

		// Co-occurrence dots (colored by the partner tag they represent, sized by shared-note count)
		dots.forEach((d) => {
			const ds = dotState(d.ni);
			const da = { normal: 0.8, active: 1, related: 0.95, dim: 0.18 }[ds];
			const sizeMul = { normal: 1, active: 1.6, related: 1.2, dim: 1 }[ds];
			const w = items[d.ni].count / maxCount;
			const nr = (3 + w * 4) * sizeMul;
			ctx!.beginPath();
			ctx!.arc(d.x, d.y, nr, 0, Math.PI * 2);
			ctx!.fillStyle = ra(colors[d.partner], da);
			ctx!.fill();
			hits.push({ type: 'dot', i: d.ni, partner: d.partner, x: d.x, y: d.y, r: 12 });
		});

		// Center
		const cc =
			hov?.type === 'tag'
				? colors[hov.i]
				: hov?.type === 'dot'
					? colors[items[hov.i].a]
					: '#888';
		ctx.beginPath();
		ctx.arc(CX, CY, r0, 0, Math.PI * 2);
		ctx.fillStyle = ra('#888', 0.06);
		ctx.fill();
		ctx.strokeStyle = ra(cc, hov ? 0.65 : 0.2);
		ctx.lineWidth = hov ? 1.5 : 0.5;
		ctx.stroke();
		ctx.font = '10px monospace';
		ctx.fillStyle = ra('#888', 0.55);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(`${tags.length}`, CX, CY - 6);
		ctx.fillText('tags', CX, CY + 6);
	}

	function hitTest(mx: number, my: number): Hit | null {
		let best: Hit | null = null;
		let bd = Infinity;
		for (const h of hits) {
			if (h.type !== 'dot') continue;
			const d = Math.hypot(mx - h.x, my - h.y);
			if (d < h.r && d < bd) {
				best = h;
				bd = d;
			}
		}
		if (best) return best;
		const dist = Math.hypot(mx - CX, my - CY);
		for (const h of hits) {
			if (h.type !== 'tag' || dist < h.r1 || dist > h.r2) continue;
			let a = Math.atan2(my - CY, mx - CX);
			while (a < h.sa - Math.PI) a += Math.PI * 2;
			while (a > h.sa + Math.PI) a -= Math.PI * 2;
			if (a >= h.sa && a <= h.ea) return h;
		}
		return null;
	}

	function handleMove(e: MouseEvent) {
		if (!canvasEl || !wrapEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const hit = hitTest(mx, my);
		const changed = JSON.stringify(hit) !== JSON.stringify(hov);
		hov = hit;
		canvasEl.style.cursor = hit ? 'pointer' : 'default';
		if (hit) {
			const wr = wrapEl.getBoundingClientRect();
			const x = Math.min(e.clientX - wr.left + 14, wr.width - 230);
			const y = Math.max(4, e.clientY - wr.top - 36);
			if (hit.type === 'tag') {
				const count = items.filter((it) => it.a === hit.i || it.b === hit.i).length;
				tip = {
					x,
					y,
					title: tagDisplayName(tags[hit.i]),
					sub: `${count} related tag${count !== 1 ? 's' : ''}`
				};
			} else {
				const count = items[hit.i].count;
				tip = {
					x,
					y,
					title: tagDisplayName(tags[hit.partner]),
					sub: `${count} shared note${count !== 1 ? 's' : ''}`
				};
			}
		} else {
			tip = null;
		}
		if (changed) draw();
	}

	function handleLeave() {
		hov = null;
		tip = null;
		draw();
	}

	function handleClick(e: MouseEvent) {
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
		if (!hit) return;
		if (hit.type === 'dot') onSelectTag(tags[hit.partner].tag);
		else onSelectTag(tags[hit.i].tag);
	}

	function resize() {
		if (!canvasEl) return;
		const dpr = window.devicePixelRatio || 1;
		W = canvasEl.offsetWidth || 680;
		H = 420;
		canvasEl.width = W * dpr;
		canvasEl.height = H * dpr;
		ctx = canvasEl.getContext('2d');
		ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
		CX = W / 2;
		CY = H / 2;
		draw();
	}

	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');
		resize();

		const ro = new ResizeObserver(() => resize());
		if (canvasEl) ro.observe(canvasEl);

		const mo = new MutationObserver(() => {
			isDark = document.documentElement.classList.contains('dark');
		});
		mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		return () => {
			ro.disconnect();
			mo.disconnect();
		};
	});

	// Redraw when data, colors, or mode change
	$effect(() => {
		colors;
		items;
		mode;
		draw();
	});
</script>

<div bind:this={wrapEl} class="relative">
	{#if settingsOpen}
		<div class="bg-card absolute top-2 right-2 z-10 w-64 rounded-lg border p-4 shadow-md">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-foreground text-sm font-semibold">{m.graph_settings_title()}</h2>
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground rounded p-1"
					onclick={() => (settingsOpen = false)}
					aria-label={m.graph_settings_close()}
				>
					<ChevronUpIcon class="size-4" />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<div class="text-foreground mb-1.5 text-xs">{m.graph_connections_label()}</div>
					<div class="flex flex-col gap-1.5 text-xs">
						<label class="flex cursor-pointer items-center gap-1.5">
							<input type="radio" bind:group={mode} value="hidden" />
							{m.graph_mode_hidden()}
						</label>
						<label class="flex cursor-pointer items-center gap-1.5">
							<input type="radio" bind:group={mode} value="faint" />
							{m.graph_mode_faint()}
						</label>
						<label class="flex cursor-pointer items-center gap-1.5">
							<input type="radio" bind:group={mode} value="split" />
							{m.graph_mode_split()}
						</label>
					</div>
				</div>

				<label class="block">
					<div class="mb-1 flex items-center justify-between">
						<span class="text-foreground text-xs">{m.graph_settings_min_cooccurrence()}</span>
						<span class="text-muted-foreground text-xs tabular-nums">{minCooccurrence}</span>
					</div>
					<input
						type="range"
						min="1"
						max={Math.max(1, maxCount)}
						step="1"
						bind:value={minCooccurrence}
						class="w-full"
					/>
				</label>
			</div>
		</div>
	{:else}
		<Button
			variant="outline"
			size="sm"
			class="absolute top-2 right-2 z-10"
			onclick={() => (settingsOpen = true)}
		>
			<SettingsIcon class="size-4" />
			{m.graph_settings_title()}
		</Button>
	{/if}

	<canvas
		bind:this={canvasEl}
		class="border-outline-variant block w-full"
		style="border-radius: var(--radius-md); border-width: 0.5px;"
		onmousemove={handleMove}
		onmouseleave={handleLeave}
		onclick={handleClick}
	></canvas>

	{#if tip}
		<div
			class="bg-card text-on-surface pointer-events-none absolute z-10 max-w-[220px] border px-2.5 py-1.5"
			style="left: {tip.x}px; top: {tip.y}px; border-radius: var(--radius-md);"
		>
			<div class="text-xs font-medium">{tip.title}</div>
			{#if tip.sub}
				<div class="text-on-surface-variant mt-0.5 text-[10px]">{tip.sub}</div>
			{/if}
		</div>
	{/if}

	<div class="mt-2.5 flex flex-wrap gap-3.5">
		{#each tags as tag, i (tag.tag)}
			<span class="flex items-center gap-1.5 font-mono text-[11px]" style="color: {colors[i]};">
				<span class="inline-block size-[7px] rounded-full" style="background: {colors[i]};"></span>
				{tagDisplayName(tag)}
			</span>
		{/each}
	</div>
</div>
