<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import OgCard from './OgCard.svelte';
	import EmbedControls from './EmbedControls.svelte';

	// raw = the URL, alt = the link label (between [ ]; empty for a bare URL).
	let {
		raw,
		alt,
		onAltChange,
		onToggleEmbed
	}: {
		raw: string;
		alt: string;
		onAltChange: (alt: string) => void;
		onToggleEmbed: () => void;
	} = $props();
</script>

<div class="my-2 flex w-full justify-center">
	<div class="group relative w-full max-w-2xl">
		<button
			type="button"
			class="w-full rounded-lg border bg-muted/30 p-3 text-left leading-4 transition-colors hover:bg-muted"
			onclick={() => openUrl(raw)}
		>
			<OgCard url={raw} label={alt} />
		</button>
		<EmbedControls {alt} {onAltChange} {onToggleEmbed} />
	</div>
</div>
