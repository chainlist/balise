<script lang="ts">
	import { ChevronUpIcon, ChevronDownIcon, XIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import TagChip from '$lib/components/cm/TagChip.svelte';
	import { fade } from 'svelte/transition';

	let {
		name,
		positions,
		onNavigate,
		onClose
	}: {
		name: string;
		positions: number[];
		onNavigate: (pos: number) => void;
		onClose: () => void;
	} = $props();

	// Occurrence the finder points at. EditorHeader jumps to the first occurrence
	// when the finder opens, so we start there too. `current` stays in range even
	// when occurrences are removed while editing.
	let index = $state(0);
	const current = $derived(Math.min(index, positions.length - 1));

	function step(direction: 1 | -1) {
		index = (current + direction + positions.length) % positions.length;
		onNavigate(positions[index]);
	}
</script>

<div
	class="frost-surface fixed top-2 right-2 z-30 flex w-fit items-center gap-2 rounded px-2 py-1 font-mono text-sm select-none"
	transition:fade|global={{ duration: 100 }}
>
	<TagChip tag={name} navigate={false} />
	<span class="text-muted-foreground tabular-nums">{current + 1}/{positions.length}</span>
	<div class="flex items-center">
		<button
			type="button"
			class="flex text-muted-foreground transition-colors hover:text-foreground"
			aria-label={m.editor_tag_prev_occurrence()}
			onclick={() => step(-1)}
		>
			<ChevronUpIcon class="size-4" />
		</button>
		<button
			type="button"
			class="flex text-muted-foreground transition-colors hover:text-foreground"
			aria-label={m.editor_tag_next_occurrence()}
			onclick={() => step(1)}
		>
			<ChevronDownIcon class="size-4" />
		</button>
	</div>
	<div class="h-4 w-px bg-border"></div>
	<button
		type="button"
		class="flex text-muted-foreground transition-colors hover:text-foreground"
		aria-label={m.action_close()}
		onclick={onClose}
	>
		<XIcon class="size-4" />
	</button>
</div>
