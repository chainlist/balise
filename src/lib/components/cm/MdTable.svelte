<script lang="ts" module>
	// Cell to focus once a structural edit rebuilds the widget (visual row 0 = the
	// header). Set right before committing; consumed by the next mount (only the
	// edited table redraws — unchanged sources are reused via the widget's eq()).
	let pendingFocus: { col: number; row: number } | null = null;

	function takePendingFocus() {
		const pf = pendingFocus;
		pendingFocus = null;
		return pf;
	}
</script>

<script lang="ts">
	import {
		parseTable,
		serializeTable,
		withColumnAligned,
		withColumnInserted,
		withColumnRemoved,
		withRowInserted,
		withRowRemoved,
		type ParsedTable
	} from '$lib/utils/cm/table-model';
	import { indexAtOrBefore, nearestEdge } from '$lib/utils/cm/table-geometry';
	import MdTableCell from './MdTableCell.svelte';
	import MdTableMenu, { type MenuItem } from './MdTableMenu.svelte';

	let { source, commit }: { source: string; commit: (md: string) => void } = $props();

	// `source` is fixed for the lifetime of a mount (a changed source is a new
	// widget), so the parse and the editable cell state are set up once.
	// svelte-ignore state_referenced_locally
	const parsed = parseTable(source);
	const align = parsed?.align ?? [];
	let headers = $state(parsed?.headers.slice() ?? []);
	let rows = $state(
		(parsed?.rows ?? []).map((r) => (parsed?.headers ?? []).map((_, i) => r[i] ?? ''))
	);

	// Restore focus into the freshly rebuilt table after a structural edit.
	const pf = takePendingFocus();
	const focusTarget =
		pf && parsed
			? {
					row: Math.min(pf.row, parsed.rows.length),
					col: Math.min(pf.col, parsed.headers.length - 1)
				}
			: null;

	// The live table contents. Alignment isn't editable inline, so it's carried
	// over from the parsed source.
	const current = (): ParsedTable => ({
		headers: headers.map((h) => h.trim()),
		align: align.slice(),
		rows: rows.map((r) => r.map((c) => c.trim()))
	});

	const commitTable = () => commit(serializeTable(current()));
	// Structural edits start from the live contents so in-progress text isn't lost.
	const structural = (mutate: (t: ParsedTable) => ParsedTable) =>
		commit(serializeTable(mutate(current())));

	// ─── Focus tracking (for the keyboard insert shortcuts) ────────────────────

	let focusCol = 0;
	let focusRow = 0; // visual row: 0 = header

	function onKeydown(e: KeyboardEvent) {
		// Ctrl+Alt+Arrow inserts a column/row next to the focused cell (as
		// advertised by the insert tooltips) and moves editing into the new cell.
		if (!e.ctrlKey || !e.altKey) return;
		if (e.key === 'ArrowRight') {
			pendingFocus = { col: focusCol + 1, row: focusRow };
			structural((t) => withColumnInserted(t, focusCol + 1));
		} else if (e.key === 'ArrowLeft') {
			pendingFocus = { col: focusCol, row: focusRow };
			structural((t) => withColumnInserted(t, focusCol));
		} else if (e.key === 'ArrowDown') {
			pendingFocus = { col: focusCol, row: focusRow + 1 };
			structural((t) => withRowInserted(t, focusRow));
		} else if (e.key === 'ArrowUp' && focusRow >= 1) {
			pendingFocus = { col: focusCol, row: focusRow };
			structural((t) => withRowInserted(t, focusRow - 1));
		} else return;
		e.preventDefault();
		e.stopPropagation();
	}

	// Commit once focus leaves the table entirely (moving between cells doesn't).
	function onFocusout(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (next && wrap && wrap.contains(next)) return;
		commitTable();
	}

	// ─── Hover controls (handles, boundary inserts, menu) ──────────────────────

	const HANDLE = 16;
	const SNAP = 9; // px distance from a grid line that reveals the + button

	let wrap = $state<HTMLElement | undefined>(undefined);
	let tableEl = $state<HTMLElement | undefined>(undefined);
	// One reference element per column (header th) and per visual row (tr, header
	// included) — used to measure grid lines on hover.
	let colEls = $state<HTMLElement[]>([]);
	let rowEls = $state<HTMLElement[]>([]);

	type Pos = { left: number; top: number };
	const pos = (cx: number, cy: number): Pos => ({ left: cx - HANDLE / 2, top: cy - HANDLE / 2 });

	let colHandlePos = $state<Pos | null>(null);
	let rowHandlePos = $state<Pos | null>(null);
	let colInsertPos = $state<Pos | null>(null);
	let rowInsertPos = $state<Pos | null>(null);
	// Insert-hover preview: a full-length accent line at the boundary + a shortcut tip.
	let line = $state<{ left: number; top: number; width: number; height: number } | null>(null);
	let tip = $state<{ text: string; left: number; top: number; transform: string } | null>(null);
	let menu = $state<{ items: MenuItem[]; x: number; y: number } | null>(null);

	let hoverCol = 0;
	let hoverRow = 0; // visual row: 0 = header
	let colBoundary = 0; // insert index for withColumnInserted
	let rowBoundary = 0; // insert index for withRowInserted
	let colBoundaryX = 0;
	let rowBoundaryY = 0;

	function tableRect() {
		const wr = wrap!.getBoundingClientRect();
		const tbl = tableEl!.getBoundingClientRect();
		return {
			top: tbl.top - wr.top,
			bottom: tbl.bottom - wr.top,
			left: tbl.left - wr.left,
			right: tbl.right - wr.left,
			wr
		};
	}

	function onMove(e: MouseEvent) {
		if (menu) return;
		const t = tableRect();
		const x = e.clientX - t.wr.left;
		const y = e.clientY - t.wr.top;

		const colLefts = colEls.map((el) => el.getBoundingClientRect().left - t.wr.left);
		const rowTops = rowEls.map((el) => el.getBoundingClientRect().top - t.wr.top);

		// Hovered column/row (for the handles).
		hoverCol = indexAtOrBefore(colLefts, x);
		hoverRow = indexAtOrBefore(rowTops, y);

		// Handles: column chevron at the top of the column, row grip at its left
		// (the header row has no row actions, so no handle there).
		const col = colEls[hoverCol].getBoundingClientRect();
		colHandlePos = pos((col.left + col.right) / 2 - t.wr.left, t.top + HANDLE / 2 + 1);
		if (hoverRow >= 1) {
			const row = rowEls[hoverRow].getBoundingClientRect();
			rowHandlePos = pos(t.left + HANDLE / 2 + 1, (row.top + row.bottom) / 2 - t.wr.top);
		} else rowHandlePos = null;

		// Nearest column boundary (grid lines incl. both outer edges).
		const cb = nearestEdge([...colLefts, t.right], x, SNAP);
		if (cb) {
			colBoundary = cb.index;
			colBoundaryX = cb.edge;
			colInsertPos = pos(cb.edge, t.top);
		} else colInsertPos = null;

		// Nearest row boundary. Boundary above the header is skipped (a table
		// can't grow a row above its header), so boundaries start under it.
		const rb = nearestEdge([...rowTops.slice(1), t.bottom], y, SNAP);
		if (rb) {
			rowBoundary = rb.index;
			rowBoundaryY = rb.edge;
			rowInsertPos = pos(t.left, rb.edge);
		} else rowInsertPos = null;
	}

	function hideAll() {
		colHandlePos = rowHandlePos = colInsertPos = rowInsertPos = null;
		line = null;
		tip = null;
	}

	// ─── Menus ──────────────────────────────────────────────────────────────────

	// The handle menus carry the non-insert actions (insertion is done with the
	// boundary + buttons, like the reference design).
	const columnItems = (): MenuItem[] => {
		const items: MenuItem[] = [
			{
				label: 'Align left',
				action: () => structural((t) => withColumnAligned(t, hoverCol, 'left'))
			},
			{
				label: 'Align center',
				action: () => structural((t) => withColumnAligned(t, hoverCol, 'center'))
			},
			{
				label: 'Align right',
				action: () => structural((t) => withColumnAligned(t, hoverCol, 'right'))
			}
		];
		if (headers.length > 1)
			items.push('sep', {
				label: 'Delete column',
				action: () => structural((t) => withColumnRemoved(t, hoverCol))
			});
		return items;
	};
	const rowItems = (): MenuItem[] => [
		{ label: 'Delete row', action: () => structural((t) => withRowRemoved(t, hoverRow - 1)) }
	];

	function openMenu(e: MouseEvent, items: MenuItem[]) {
		e.preventDefault();
		e.stopPropagation();
		if (menu) {
			menu = null;
			return;
		}
		const wr = wrap!.getBoundingClientRect();
		const hr = (e.currentTarget as HTMLElement).getBoundingClientRect();
		menu = { items, x: hr.left - wr.left, y: hr.bottom - wr.top + 2 };
	}

	// ─── Boundary inserts ───────────────────────────────────────────────────────

	function colInsertEnter() {
		const t = tableRect();
		line = { left: colBoundaryX - 1, top: t.top, width: 2, height: t.bottom - t.top };
		// Anchored by its bottom edge so it always clears the + button (top edge
		// of the button is at t.top - 8), whatever height the tip renders at.
		tip = {
			text: 'Insert column  Ctrl+Alt+→',
			left: colBoundaryX,
			top: t.top - 12,
			transform: 'translate(-50%, -100%)'
		};
	}
	function rowInsertEnter() {
		const t = tableRect();
		line = { left: t.left, top: rowBoundaryY - 1, width: t.right - t.left, height: 2 };
		// Bottom-anchored above the + button (button top is rowBoundaryY - 8),
		// shifted right so it doesn't cover the button either.
		tip = {
			text: 'Insert row  Ctrl+Alt+↓',
			left: t.left + 12,
			top: rowBoundaryY - 12,
			transform: 'translateY(-100%)'
		};
	}
	function insertLeave() {
		line = null;
		tip = null;
	}

	function colInsertDown(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		pendingFocus = { col: colBoundary, row: 0 };
		structural((t) => withColumnInserted(t, colBoundary));
	}
	function rowInsertDown(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		pendingFocus = { col: 0, row: rowBoundary + 1 };
		structural((t) => withRowInserted(t, rowBoundary));
	}
</script>

{#if !parsed}
	<div class="cm-md-table-wrap">{source}</div>
{:else}
	<!-- The table scrolls horizontally inside the scroll div; the hover controls
	     live on the wrap (overflow visible) so they can float just outside the
	     table edges without stealing layout width or being clipped. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={wrap}
		class="cm-md-table-wrap"
		onmouseleave={() => {
			if (!menu) hideAll();
		}}
		onfocusout={onFocusout}
		onkeydown={onKeydown}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="cm-md-table-scroll" onmousemove={onMove}>
			<table class="cm-md-table">
				<thead>
					<tr bind:this={rowEls[0]}>
						{#each headers, c (c)}
							<th bind:this={colEls[c]}>
								<MdTableCell
									bind:value={headers[c]}
									align={align[c]}
									autofocus={focusTarget?.row === 0 && focusTarget?.col === c}
									onfocus={() => {
										focusRow = 0;
										focusCol = c;
									}}
								/>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows, r (r)}
						<tr bind:this={rowEls[r + 1]}>
							{#each headers, c (c)}
								<td>
									<MdTableCell
										bind:value={rows[r][c]}
										align={align[c]}
										autofocus={focusTarget?.row === r + 1 && focusTarget?.col === c}
										onfocus={() => {
											focusRow = r + 1;
											focusCol = c;
										}}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if colHandlePos}
			<button
				type="button"
				class="cm-md-table-handle"
				title="Column options"
				style:left="{colHandlePos.left}px"
				style:top="{colHandlePos.top}px"
				onmousedown={(e) => openMenu(e, columnItems())}
			>
				<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
					<path
						d="M2 3.5l3 3 3-3"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{/if}
		{#if rowHandlePos}
			<button
				type="button"
				class="cm-md-table-handle"
				title="Row options"
				style:left="{rowHandlePos.left}px"
				style:top="{rowHandlePos.top}px"
				onmousedown={(e) => openMenu(e, rowItems())}
			>
				<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
					<circle cx="5" cy="1.5" r="1.1" fill="currentColor" />
					<circle cx="5" cy="5" r="1.1" fill="currentColor" />
					<circle cx="5" cy="8.5" r="1.1" fill="currentColor" />
				</svg>
			</button>
		{/if}

		{#if colInsertPos}
			<button
				type="button"
				class="cm-md-table-insert"
				aria-label="Insert column"
				style:left="{colInsertPos.left}px"
				style:top="{colInsertPos.top}px"
				onmouseenter={colInsertEnter}
				onmouseleave={insertLeave}
				onmousedown={colInsertDown}
			>
				<!-- A drawn cross instead of a "+" glyph: text sits on a font baseline and
				     is not optically centered in the circle, while the SVG centers exactly. -->
				<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
					<path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</button>
		{/if}
		{#if rowInsertPos}
			<button
				type="button"
				class="cm-md-table-insert"
				aria-label="Insert row"
				style:left="{rowInsertPos.left}px"
				style:top="{rowInsertPos.top}px"
				onmouseenter={rowInsertEnter}
				onmouseleave={insertLeave}
				onmousedown={rowInsertDown}
			>
				<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
					<path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</button>
		{/if}

		{#if line}
			<div
				class="cm-md-table-insert-line"
				style:left="{line.left}px"
				style:top="{line.top}px"
				style:width="{line.width}px"
				style:height="{line.height}px"
			></div>
		{/if}
		{#if tip}
			<div
				class="cm-md-table-tip"
				style:left="{tip.left}px"
				style:top="{tip.top}px"
				style:transform={tip.transform}
			>
				{tip.text}
			</div>
		{/if}

		{#if menu}
			<MdTableMenu items={menu.items} x={menu.x} y={menu.y} onclose={() => (menu = null)} />
		{/if}
	</div>
{/if}
