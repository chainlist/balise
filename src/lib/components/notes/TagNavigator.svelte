<script lang="ts">
	import { ChevronUpIcon, ChevronDownIcon } from '@lucide/svelte';
	import { tagsService } from '$lib/services/content/tags.svelte';
	import * as m from '$paraglide/messages.js';

	let {
		name,
		positions,
		onNavigate
	}: {
		name: string;
		positions: number[];
		onNavigate: (pos: number) => void;
	} = $props();

	// Index of the occurrence the cursor last jumped to; -1 so the first
	// "down" lands on the first occurrence and the first "up" on the last.
	let index = $state(-1);

	const tagData = $derived(
		tagsService.tags.find((t) => t.tag.toLowerCase() === name.toLowerCase())
	);
	const label = $derived(tagData?.display_name ?? tagData?.tag ?? name);
	const color = $derived(tagData?.color ?? 'var(--primary)');

	function step(direction: 1 | -1) {
		index = (index + direction + positions.length) % positions.length;
		onNavigate(positions[index]);
	}
</script>

<div
	class="inline-flex h-6 items-center gap-1.5 rounded-md border pr-1 pl-2 font-mono text-xs select-none"
	style="color: {color}; border-color: color-mix(in oklch, {color} 25%, transparent); background: color-mix(in oklch, {color} 10%, transparent);"
>
	<span class="leading-none font-medium">#{label}</span>
	<span class="leading-none tabular-nums opacity-60">{positions.length}</span>
	<div class="h-3.5 w-px" style="background: color-mix(in oklch, {color} 22%, transparent);"></div>
	<div class="flex flex-col">
		<button
			type="button"
			class="-mb-px flex opacity-50 transition-opacity hover:opacity-100"
			aria-label={m.editor_tag_prev_occurrence()}
			onclick={() => step(-1)}
		>
			<ChevronUpIcon class="size-3" />
		</button>
		<button
			type="button"
			class="-mt-px flex opacity-50 transition-opacity hover:opacity-100"
			aria-label={m.editor_tag_next_occurrence()}
			onclick={() => step(1)}
		>
			<ChevronDownIcon class="size-3" />
		</button>
	</div>
</div>
