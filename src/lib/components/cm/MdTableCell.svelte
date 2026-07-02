<script lang="ts">
	import { marked } from 'marked';
	import type { ColumnAlign } from '$lib/utils/cm/table-model';

	let {
		value = $bindable(),
		align,
		autofocus = false,
		onfocus
	}: {
		value: string;
		align: ColumnAlign;
		autofocus?: boolean;
		onfocus?: () => void;
	} = $props();

	let area = $state<HTMLTextAreaElement | undefined>(undefined);

	// Focus lands after the widget DOM is attached (structural edits rebuild the
	// whole table, and the cell to re-focus mounts with autofocus set).
	$effect(() => {
		if (autofocus && area) {
			const el = area;
			requestAnimationFrame(() => el.focus());
		}
	});

	function onkeydown(e: KeyboardEvent) {
		// Cells can't hold newlines (they'd break the row), so Enter commits and
		// leaves instead of inserting one; Escape just leaves. Commit happens
		// when focus leaves the table.
		if (e.key === 'Enter' || e.key === 'Escape') {
			e.preventDefault();
			area?.blur();
		}
	}

	// Clicking the cell's padding (outside the textarea) still focuses it for editing.
	function onmousedown(e: MouseEvent) {
		if (e.target === area) return;
		e.preventDefault();
		area?.focus();
	}
</script>

<!-- The wrapper holds the padding and auto-grows in height: its ::after mirrors
     the textarea's text (via data-value) so the grid row is as tall as the wrapped
     content, and the textarea is stretched over it. The rendered layer underneath
     the (text-transparent) textarea shows the cell's inline markdown; focusing the
     cell reveals the raw text instead (see `.cm-md-table-cell` in the theme). -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="cm-md-table-cell" data-value={value} style:text-align={align} {onmousedown}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<div class="cm-md-table-cell-rendered">{@html marked.parseInline(value)}</div>
	<textarea
		bind:this={area}
		bind:value
		class="cm-md-table-cell-input"
		rows="1"
		cols="1"
		{onfocus}
		{onkeydown}
	></textarea>
</div>
