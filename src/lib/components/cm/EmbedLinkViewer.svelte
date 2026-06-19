<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import OgCard from './OgCard.svelte';

	// raw = the URL, alt = the link label (between [ ]; empty for a bare URL).
	let { raw, alt }: { raw: string; alt: string } = $props();
</script>

<div class="my-2 flex w-full justify-center">
	<button
		type="button"
		class="w-full max-w-2xl rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:bg-muted"
		onclick={() => openUrl(raw)}
	>
		<OgCard url={raw} label={alt} />
	</button>
</div>
