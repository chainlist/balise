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
		cover = false,
		onAltChange,
		onToggleEmbed
	}: {
		path: string;
		alt: string;
		cover?: boolean;
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

<div class="image-wrapper relative {cover ? 'cover-bleed' : 'grid w-full place-items-center py-2'}">
	{#if src}
		<div class="group {cover ? 'cover-bleed-inner' : 'relative flex'}">
			<img
				{src}
				{alt}
				class={cover ? 'block h-full w-full object-cover' : 'block max-h-96 max-w-full rounded'}
			/>
			<EmbedControls {alt} {onAltChange} {onToggleEmbed} />
		</div>
		{#if alt && !cover}
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

<style>
	/* In-flow placeholder: reserves the banner's height at the column width and is
	   the positioning context for the bleed layer. Crucially it is NOT pane-wide,
	   so it never widens CodeMirror's flex `.cm-content` (and the wrapped text). */
	.cover-bleed {
		position: relative;
		height: 280px;
	}

	/* The banner image itself, absolutely positioned so its full-pane width is out
	   of flow and never feeds `.cm-content`'s min-content sizing. `--cover-width`
	   is the pane's client width, set on the scroll container in EditorView. Shift
	   left by the column's inset: the column is `max-w-175` (43.75rem) centred in
	   the pane, plus the editor's 1.5rem scroller padding. Keep these in sync with
	   Editor.svelte / theme.ts. */
	.cover-bleed-inner {
		position: absolute;
		top: 0;
		left: calc(-4rem - max(0px, var(--cover-width, 100%) - 45rem) / 2);
		width: var(--cover-width, 100%);
		height: 100%;
		overflow: hidden;
	}
</style>
