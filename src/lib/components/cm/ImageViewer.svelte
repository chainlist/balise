<script module lang="ts">
	import { SvelteMap } from 'svelte/reactivity';

	// Object URLs cached per path so a widget remount (e.g. after an alt
	// change rewrites the doc) renders the image synchronously, without
	// re-reading the file and blinking. URLs live for the app lifetime.
	const urlCache = new SvelteMap<string, string>();
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Pencil } from '@lucide/svelte';
	import { fsService } from '$lib/services/platform/fs';
	import { Input } from '$lib/components/shadcn/input';
	import { Button } from '$lib/components/shadcn/button';
	import * as m from '$paraglide/messages.js';
	import { on } from 'svelte/events';
	import { fade } from 'svelte/transition';

	let {
		path,
		alt,
		onAltChange
	}: { path: string; alt: string; onAltChange: (alt: string) => void } = $props();

	let src = $state('');
	let error = $state(false);
	let editing = $state(false);
	let draft = $state('');
	let inputRef = $state<HTMLInputElement | null>(null);

	function startEdit() {
		draft = alt;
		editing = true;
	}

	function cancel() {
		editing = false;
	}

	function commit() {
		if (!editing) return;
		editing = false;
		const next = draft.trim();
		if (next !== alt) onAltChange(next);
	}

	function onKeydown(event: KeyboardEvent) {
		event.stopPropagation();
		if (event.key === 'Enter') commit();
		else if (event.key === 'Escape') cancel();
	}

	// Attached to the overlay, so the listener only exists while it is open.
	// Capture phase so the click is seen before CodeMirror swallows it.
	function cancelOnOutsidePointer(overlay: HTMLElement) {
		const onPointerDown = (event: PointerEvent) => {
			if (!overlay.contains(event.target as Node)) cancel();
		};
		return on(document, 'pointerdown', onPointerDown, { capture: true });
	}

	$effect(() => {
		if (editing) inputRef?.focus();
	});

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
		fsService
			.readFile(path)
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

<div class="image-wrapper group relative grid w-full place-items-center py-2">
	{#if src}
		<div class="relative flex">
			<img {src} {alt} class="block max-h-96 max-w-full rounded" ondblclick={startEdit} />
			{#if editing}
				<div
					class="absolute inset-0 flex flex-col items-center justify-center gap-3 frost-surface rounded"
					transition:fade={{ duration: 100 }}
					{@attach cancelOnOutsidePointer}
				>
					<Input
						bind:ref={inputRef}
						class="h-8 w-64 max-w-[80%] border border-primary text-center text-xs focus-visible:ring-0 md:text-xs"
						placeholder={m.image_add_description()}
						bind:value={draft}
						onkeydown={onKeydown}
					/>
					<div class="flex gap-2">
						<Button
							variant="secondary"
							size="sm"
							class="bg-white text-black hover:bg-white/90"
							onclick={cancel}
						>
							{m.action_cancel()}
						</Button>
						<Button size="sm" onclick={commit}>{m.action_save()}</Button>
					</div>
				</div>
			{:else}
				<button
					class="absolute top-2 right-2 rounded bg-background/70 p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
					onclick={startEdit}
					aria-label={m.image_add_description()}
				>
					<Pencil class="size-3.5" />
				</button>
			{/if}
		</div>
		{#if alt && !editing}
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
