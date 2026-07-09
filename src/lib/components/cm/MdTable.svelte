<script lang="ts" module>
	// Cell to focus once a structural edit rebuilds the widget (row -1 = the
	// header row, 0.. = data rows). Set right before committing; consumed by the
	// next mount (only the edited table redraws — unchanged sources are reused
	// via the widget's eq()).
	let pendingFocus: { col: number; row: number } | null = null;

	function takePendingFocus() {
		const pf = pendingFocus;
		pendingFocus = null;
		return pf;
	}

	// Keep the toolbar open across the rebuild a structural edit causes: edits
	// are mouse-driven from inside the widget, so the pointer is still over the
	// rebuilt table, but the fresh mount would otherwise start un-hovered.
	let pendingHover = false;

	function takePendingHover() {
		const h = pendingHover;
		pendingHover = false;
		return h;
	}

	// The header flags of the table being committed. When the affected row or
	// column has no content the flags are not representable in the markdown
	// (see table-model.ts), so a reparse alone would drop them; every commit
	// hands them to the rebuilt widget instead.
	let pendingFlags: { headerRow: boolean; headerCol: boolean } | null = null;

	function takePendingFlags() {
		const f = pendingFlags;
		pendingFlags = null;
		return f;
	}
</script>

<script lang="ts">
	import {
		parseTable,
		serializeTable,
		withColumnInserted,
		withColumnRemoved,
		withHeaderColToggled,
		withHeaderRowToggled,
		withRowInserted,
		withRowRemoved,
		type ParsedTable
	} from '$lib/utils/cm/table-model';
	import { indexAtOrBefore } from '$lib/utils/cm/table-geometry';
	import MdTableCell from './MdTableCell.svelte';
	import MdTableToolbar from './MdTableToolbar.svelte';
	import MdTableAxisControls, { type Cluster } from './MdTableAxisControls.svelte';

	let { source, commit }: { source: string; commit: (md: string) => void } = $props();

	// `source` is fixed for the lifetime of a mount (a changed source is a new
	// widget), so the parse and the editable cell state are set up once.
	// svelte-ignore state_referenced_locally
	const parsed = parseTable(source);
	const flags = takePendingFlags();
	let headerRow = $state(flags?.headerRow ?? parsed?.headerRow ?? true);
	let headerCol = $state(flags?.headerCol ?? parsed?.headerCol ?? false);
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
					row: Math.min(pf.row, parsed.rows.length - 1),
					col: Math.min(pf.col, parsed.headers.length - 1)
				}
			: null;

	// The live table contents. Alignment isn't editable inline, so it's carried
	// over from the parsed source, as are the two header flags.
	const current = (): ParsedTable => ({
		headerRow,
		headerCol,
		headers: headers.map((h) => h.trim()),
		align: align.slice(),
		rows: rows.map((r) => r.map((c) => c.trim()))
	});

	function commitWith(t: ParsedTable) {
		pendingFlags = { headerRow: t.headerRow, headerCol: t.headerCol };
		commit(serializeTable(t));
		// A doc change rebuilds the widget synchronously inside commit, consuming
		// the flags; clear them here for commits that changed nothing.
		pendingFlags = null;
	}

	const commitTable = () => commitWith(current());
	// Structural edits start from the live contents so in-progress text isn't lost.
	const structural = (mutate: (t: ParsedTable) => ParsedTable) => {
		const t = mutate(current());
		pendingHover = true;
		commitWith(t);
		// If the markdown didn't change there was no rebuild: apply the flag
		// change (e.g. a header toggle on empty content) on this instance.
		// After a rebuild these writes land on the unmounted instance, harmlessly.
		headerRow = t.headerRow;
		headerCol = t.headerCol;
	};

	// Commit once focus leaves the table entirely (moving between cells doesn't).
	function onFocusout(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (next && wrap && wrap.contains(next)) return;
		commitTable();
	}

	// ─── Hover controls (header toggles, insert/delete clusters) ───────────────

	const BTN = 16;

	let wrap = $state<HTMLElement | undefined>(undefined);
	let tableEl = $state<HTMLTableElement | undefined>(undefined);
	let hovering = $state(takePendingHover());
	// The toolbar floats above the wrap with a gap, so leaving the table toward
	// it crosses a dead zone; hiding waits out this grace period, and reaching
	// the toolbar (a wrap descendant) re-fires mouseenter which cancels it.
	const HIDE_DELAY = 250;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	function onEnter() {
		clearTimeout(hideTimer);
		hovering = true;
	}
	let colCluster = $state<Cluster | null>(null);
	let rowCluster = $state<Cluster | null>(null);
	let hoverCol = 0;
	let hoverRow = 0; // data row index; the header row has no row controls

	const pos = (cx: number, cy: number) => ({ left: cx - BTN / 2, top: cy - BTN / 2 });

	// mousemove lives on the scroll div while the buttons are siblings on the
	// wrap, so hovering a button (which straddles a grid edge) doesn't retarget
	// the hover and move the buttons out from under the cursor.
	function onMove(e: MouseEvent) {
		// A structural edit rebuilds the widget under a stationary pointer, so
		// mouseenter won't re-fire; the next movement restores the toolbar.
		hovering = true;
		if (!wrap || !tableEl) return;
		const wr = wrap.getBoundingClientRect();
		const colCells = Array.from(tableEl.rows[0]?.cells ?? []);
		const bodyRows = Array.from(tableEl.tBodies[0]?.rows ?? []);
		if (colCells.length === 0) return;
		const x = e.clientX - wr.left;
		const y = e.clientY - wr.top;
		const tbl = tableEl.getBoundingClientRect();
		const top = tbl.top - wr.top;
		const left = tbl.left - wr.left;

		// The hovered column: + circles on each side of its top edge, delete in between.
		const colLefts = colCells.map((el) => el.getBoundingClientRect().left - wr.left);
		const c = indexAtOrBefore(colLefts, x);
		if (c >= 0) {
			hoverCol = c;
			const r = colCells[c].getBoundingClientRect();
			colCluster = {
				before: pos(r.left - wr.left, top),
				after: pos(r.right - wr.left, top),
				remove: pos((r.left + r.right) / 2 - wr.left, top)
			};
		} else colCluster = null;

		// The hovered data row: same cluster on its left edge (hovering the header
		// row yields no row controls — the header is managed by the toolbar toggle).
		const rowTops = bodyRows.map((el) => el.getBoundingClientRect().top - wr.top);
		const ri = indexAtOrBefore(rowTops, y);
		if (ri >= 0) {
			hoverRow = ri;
			const r = bodyRows[ri].getBoundingClientRect();
			rowCluster = {
				before: pos(left, r.top - wr.top),
				after: pos(left, r.bottom - wr.top),
				remove: pos(left, (r.top + r.bottom) / 2 - wr.top)
			};
		} else rowCluster = null;
	}

	function onLeave() {
		colCluster = null;
		rowCluster = null;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => (hovering = false), HIDE_DELAY);
	}

	$effect(() => () => clearTimeout(hideTimer));

	// A headerless table must keep at least one data row (nothing would be left
	// to see or hover); with a header row the header alone is a valid table.
	const canRemoveRow = () => headerRow || rows.length > 1;

	function addColumn(side: 'before' | 'after') {
		const at = side === 'before' ? hoverCol : hoverCol + 1;
		pendingFocus = { col: at, row: headerRow ? -1 : 0 };
		structural((t) => withColumnInserted(t, at));
	}

	function addRow(side: 'before' | 'after') {
		const at = side === 'before' ? hoverRow : hoverRow + 1;
		pendingFocus = { col: 0, row: at };
		structural((t) => withRowInserted(t, at));
	}
</script>

{#if !parsed}
	<div class="cm-md-table-wrap">{source}</div>
{:else}
	<!-- The table scrolls horizontally inside the scroll div; the hover controls
	     live on the wrap (overflow visible) so they can float on the table edges
	     without stealing layout width or being clipped. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={wrap}
		class="cm-md-table-wrap"
		onmouseenter={onEnter}
		onmouseleave={onLeave}
		onfocusout={onFocusout}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="cm-md-table-scroll" onmousemove={onMove}>
			<table bind:this={tableEl} class="cm-md-table">
				{#if headerRow}
					<thead>
						<tr>
							{#each headers, c (c)}
								<th>
									<MdTableCell
										bind:value={headers[c]}
										align={align[c]}
										autofocus={focusTarget?.row === -1 && focusTarget?.col === c}
									/>
								</th>
							{/each}
						</tr>
					</thead>
				{/if}
				<tbody>
					{#each rows, r (r)}
						<tr>
							{#each headers, c (c)}
								<td class:cm-md-table-colheader={headerCol && c === 0}>
									<MdTableCell
										bind:value={rows[r][c]}
										align={align[c]}
										autofocus={focusTarget?.row === r && focusTarget?.col === c}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if hovering}
			<MdTableToolbar
				{headerRow}
				{headerCol}
				ontoggleheaderrow={() => structural(withHeaderRowToggled)}
				ontoggleheadercol={() => structural(withHeaderColToggled)}
			/>
		{/if}

		{#if colCluster}
			<MdTableAxisControls
				cluster={colCluster}
				axis="column"
				canRemove={headers.length > 1}
				onadd={addColumn}
				onremove={() => structural((t) => withColumnRemoved(t, hoverCol))}
			/>
		{/if}
		{#if rowCluster}
			<MdTableAxisControls
				cluster={rowCluster}
				axis="row"
				canRemove={canRemoveRow()}
				onadd={addRow}
				onremove={() => structural((t) => withRowRemoved(t, hoverRow))}
			/>
		{/if}
	</div>
{/if}
