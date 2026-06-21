<script lang="ts">
	import { Pencil, Link2 } from '@lucide/svelte';
	import { Input } from '$lib/components/shadcn/input';
	import { Button } from '$lib/components/shadcn/button';
	import * as m from '$paraglide/messages.js';
	import { on } from 'svelte/events';
	import { fade } from 'svelte/transition';

	// Hover controls for an embed: edit its alt/label, or demote it to a plain
	// link. Rendered inside each viewer's `group relative` box so the buttons and
	// the edit overlay position over the embed content.
	let {
		alt,
		onAltChange,
		onToggleEmbed
	}: {
		alt: string;
		onAltChange: (alt: string) => void;
		onToggleEmbed: () => void;
	} = $props();

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
</script>

{#if editing}
	<div
		class="frost absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded"
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
	<div
		class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
	>
		<button
			class="rounded bg-background/70 p-1.5 text-muted-foreground hover:text-foreground"
			onclick={onToggleEmbed}
			aria-label={m.embed_show_as_link()}
		>
			<Link2 class="size-3.5" />
		</button>
		<button
			class="rounded bg-background/70 p-1.5 text-muted-foreground hover:text-foreground"
			onclick={startEdit}
			aria-label={m.image_add_description()}
		>
			<Pencil class="size-3.5" />
		</button>
	</div>
{/if}
