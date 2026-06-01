<script lang="ts">
	import { Pane, type PaneProps } from 'paneforge';

	let { ref = $bindable(null), ...restProps }: PaneProps = $props();
</script>

<Pane bind:ref data-slot="resizable-pane" {...restProps} />
