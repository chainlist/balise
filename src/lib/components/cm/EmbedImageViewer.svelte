<script module lang="ts">
	import { SvelteMap } from 'svelte/reactivity';

	// Object URLs cached per path so a widget remount (e.g. after an alt
	// change rewrites the doc) renders the image synchronously, without
	// re-reading the file and blinking. URLs live for the app lifetime.
	const urlCache = new SvelteMap<string, string>();
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { assetsService } from '$lib/services/assets';
	import * as m from '$paraglide/messages.js';
	import EmbedControls from './EmbedControls.svelte';

	let {
		path,
		alt,
		onAltChange,
		onToggleEmbed
	}: {
		path: string;
		alt: string;
		onAltChange: (alt: string) => void;
		onToggleEmbed: () => void;
	} = $props();

	let src = $state('');
	let error = $state(false);

	onMount(() => {
		// onMount runs before the browser paints, so cache hits render the
		// image on the first frame (no blink on widget remount).
		if (path.startsWith('http://') || path.startsWith('https://')) {
			src = path;
			return;
		}
		const cached = urlCache.get(path);
		if (cached) {
			src = cached;
			return;
		}
		assetsService
			.readImage(path)
			.then((data) => {
				const url = URL.createObjectURL(new Blob([data]));
				urlCache.set(path, url);
				src = url;
			})
			.catch(() => {
				error = true;
			});
	});
</script>

<div class="image-wrapper relative grid w-full place-items-center py-2">
	{#if src}
		<div class="group relative flex">
			<img {src} {alt} class="block max-h-96 max-w-full rounded" />
			<EmbedControls {alt} {onAltChange} {onToggleEmbed} />
		</div>
		{#if alt}
			<span
				class="absolute -bottom-3 left-1/2 max-w-full -translate-x-1/2 truncate px-2 py-0.5 text-sm text-muted-foreground italic"
			>
				{alt}
			</span>
		{/if}
	{:else if error}
		<span class="text-sm text-muted-foreground italic">{m.image_not_found()}</span>
	{/if}
</div>
