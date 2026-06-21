<script lang="ts">
	import type { Component } from 'svelte';
	import { matchEmbed, isImageUrl, type EmbedKind } from '$lib/utils/cm/embeds.config';
	import EmbedImageViewer from './EmbedImageViewer.svelte';
	import EmbedVideoViewer from './EmbedVideoViewer.svelte';
	import EmbedLinkViewer from './EmbedLinkViewer.svelte';

	let {
		url,
		alt,
		onAltChange,
		onToggleEmbed
	}: {
		url: string;
		alt: string;
		onAltChange: (alt: string) => void;
		onToggleEmbed: () => void;
	} = $props();

	// Props every embed-kind component receives: the raw URL, the transformed
	// iframe src, the regex match (used only by kinds that need its groups), and
	// the shared edit/toggle controls.
	type ViewerProps = {
		raw: string;
		transformed: string;
		match: RegExpMatchArray;
		alt: string;
		onAltChange: (alt: string) => void;
		onToggleEmbed: () => void;
	};

	// kind → component. Add an entry here when adding a new kind in embeds.config.ts.
	const VIEWERS: Record<EmbedKind, Component<ViewerProps>> = {
		video: EmbedVideoViewer
	};

	const embed = $derived(matchEmbed(url));
</script>

{#if embed}
	{@const Viewer = VIEWERS[embed.def.kind]}
	<Viewer
		raw={url}
		transformed={embed.src}
		match={embed.match}
		{alt}
		{onAltChange}
		{onToggleEmbed}
	/>
{:else if isImageUrl(url)}
	<EmbedImageViewer path={url} {alt} {onAltChange} {onToggleEmbed} />
{:else}
	<EmbedLinkViewer raw={url} {alt} {onAltChange} {onToggleEmbed} />
{/if}
