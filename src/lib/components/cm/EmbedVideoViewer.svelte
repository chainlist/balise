<script lang="ts">
	import EmbedControls from './EmbedControls.svelte';

	let {
		raw,
		transformed,
		alt,
		onAltChange,
		onToggleEmbed
	}: {
		raw: string;
		transformed: string;
		alt: string;
		onAltChange: (alt: string) => void;
		onToggleEmbed: () => void;
	} = $props();
</script>

<div class="grid w-full place-items-center py-2">
	<div class="group relative aspect-video w-full max-w-2xl overflow-hidden rounded">
		<iframe
			class="h-full w-full border-0"
			src={transformed}
			title={raw}
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			allowfullscreen
		></iframe>
		<EmbedControls {alt} {onAltChange} {onToggleEmbed} />
	</div>
</div>
