<script lang="ts">
	import type { Component } from 'svelte';
	import { matchEmbed, type EmbedKind } from '$lib/utils/cm/embeds.config';
	import EmbedImageViewer from './EmbedImageViewer.svelte';
	import EmbedVideoViewer from './EmbedVideoViewer.svelte';

	let {
		url,
		alt,
		onAltChange
	}: { url: string; alt: string; onAltChange: (alt: string) => void } = $props();

	// Props every embed-kind component receives: the raw URL, the transformed
	// iframe src, and the regex match (used only by kinds that need its groups).
	type ViewerProps = { raw: string; transformed: string; match: RegExpMatchArray };

	// kind → component. Add an entry here when adding a new kind in embeds.config.ts.
	const VIEWERS: Record<EmbedKind, Component<ViewerProps>> = {
		video: EmbedVideoViewer
	};

	const embed = $derived(matchEmbed(url));
</script>

{#if embed}
	{@const Viewer = VIEWERS[embed.def.kind]}
	<Viewer raw={url} transformed={embed.src} match={embed.match} />
{:else}
	<EmbedImageViewer path={url} {alt} {onAltChange} />
{/if}
