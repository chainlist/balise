<script lang="ts">
	import { uiState } from '$lib/services/ui-state.svelte';

	let { label, date }: { label: string; date: Date } = $props();

	function nav() {
		void uiState.setActiveDay(date);
	}

	// Keep focus (and the cursor) in the editor: a plain click would move focus to
	// this button, blurring CodeMirror and triggering a full mark-decoration
	// rebuild (a visible blink). The click still fires on mouseup.
	function keepEditorFocus(event: MouseEvent) {
		event.preventDefault();
	}
</script>

<button
	type="button"
	class="cm-md-date cursor-pointer align-baseline select-none"
	onmousedown={keepEditorFocus}
	onclick={nav}
>
	{label}
</button>
