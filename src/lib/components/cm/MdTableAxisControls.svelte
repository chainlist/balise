<script lang="ts" module>
	// The floating controls for the hovered column or row: a + circle on each
	// side (insert before/after) and a delete button between them. Positions are
	// computed by MdTable from the hovered cell's geometry.
	export type Pos = { left: number; top: number };
	export type Cluster = { before: Pos; after: Pos; remove: Pos };
</script>

<script lang="ts">
	let {
		cluster,
		axis,
		canRemove,
		onadd,
		onremove
	}: {
		cluster: Cluster;
		axis: 'column' | 'row';
		canRemove: boolean;
		onadd: (side: 'before' | 'after') => void;
		onremove: () => void;
	} = $props();

	// mousedown (not click): the action commits a doc change that rebuilds the
	// widget, which would swallow the click's second half.
	function act(e: MouseEvent, action: () => void) {
		e.preventDefault();
		e.stopPropagation();
		action();
	}
</script>

{#each [{ side: 'before' as const, p: cluster.before }, { side: 'after' as const, p: cluster.after }] as { side, p } (side)}
	<button
		type="button"
		class="cm-md-table-insert"
		aria-label="Insert {axis} {side}"
		style:left="{p.left}px"
		style:top="{p.top}px"
		onmousedown={(e) => act(e, () => onadd(side))}
	>
		<!-- A drawn cross instead of a "+" glyph: text sits on a font baseline and
		     is not optically centered in the circle, while the SVG centers exactly. -->
		<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
			<path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
		</svg>
	</button>
{/each}

{#if canRemove}
	<button
		type="button"
		class="cm-md-table-delete"
		aria-label="Delete {axis}"
		style:left="{cluster.remove.left}px"
		style:top="{cluster.remove.top}px"
		onmousedown={(e) => act(e, onremove)}
	>
		<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
			<path
				d="M2.5 2.5l5 5M7.5 2.5l-5 5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
			/>
		</svg>
	</button>
{/if}
