<script lang="ts">
	import { PanelLeft, PanelTop } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	let {
		headerRow,
		headerCol,
		ontoggleheaderrow,
		ontoggleheadercol
	}: {
		headerRow: boolean;
		headerCol: boolean;
		ontoggleheaderrow: () => void;
		ontoggleheadercol: () => void;
	} = $props();

	// mousedown (not click) so the toggle runs before the widget is rebuilt by the
	// resulting commit, and preventDefault so a focused cell isn't blurred first.
	function toggle(e: MouseEvent, action: () => void) {
		e.preventDefault();
		e.stopPropagation();
		action();
	}
</script>

<div class="cm-md-table-toolbar">
	<button
		type="button"
		class="cm-md-table-toolbar-btn"
		aria-pressed={headerRow}
		aria-label={m.editor_table_header_row()}
		title={m.editor_table_header_row()}
		onmousedown={(e) => toggle(e, ontoggleheaderrow)}
	>
		<PanelTop size={16} aria-hidden="true" />
	</button>
	<button
		type="button"
		class="cm-md-table-toolbar-btn"
		aria-pressed={headerCol}
		aria-label={m.editor_table_header_col()}
		title={m.editor_table_header_col()}
		onmousedown={(e) => toggle(e, ontoggleheadercol)}
	>
		<PanelLeft size={16} aria-hidden="true" />
	</button>
</div>
