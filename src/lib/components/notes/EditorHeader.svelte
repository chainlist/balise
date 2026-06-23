<script lang="ts">
	import * as m from '$paraglide/messages.js';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import type { TagOccurrences } from '$lib/domain/tag';
	import TagChip from '$lib/components/cm/TagChip.svelte';
	import TagNavigator from './TagNavigator.svelte';

	let {
		readingTime,
		date,
		tags,
		onNavigate
	}: {
		readingTime: number;
		date: Date;
		tags: TagOccurrences[];
		onNavigate: (pos: number) => void;
	} = $props();

	const intl = $derived(
		new Intl.DateTimeFormat(settingsService.general.state.language, { dateStyle: 'medium' })
	);

	// Name of the tag whose occurrences the floating finder is cycling, or null
	// when no finder is open. Derived from `tags` so it stays fresh as the note
	// is edited and clears itself when the tag disappears.
	let selectedName = $state<string | null>(null);
	const selected = $derived(
		tags.find((t) => t.name.toLowerCase() === selectedName?.toLowerCase()) ?? null
	);

	function toggle(tag: TagOccurrences) {
		if (selectedName?.toLowerCase() === tag.name.toLowerCase()) {
			selectedName = null;
			return;
		}
		selectedName = tag.name;
		onNavigate(tag.positions[0]);
	}
</script>

<div
	class="mx-auto flex w-full max-w-175 flex-col gap-2 px-10 pt-4 pb-2 font-mono text-xs text-muted-foreground select-none"
>
	<div class="flex items-center gap-2">
		<span class="font-bold">{intl.format(date)}</span>
		<span class="font-bold">·</span>
		<span>{m.editor_reading_time({ minutes: readingTime })}</span>
	</div>

	{#if tags.length}
		<div class="flex flex-wrap gap-1.5">
			{#each tags as tag (tag.name)}
				{@const navigable = tag.positions.length > 0}
				<svelte:element
					this={navigable ? 'button' : 'span'}
					{...navigable ? { type: 'button' } : {}}
					class="text-xs"
					class:cursor-pointer={navigable}
					onclick={navigable ? () => toggle(tag) : undefined}
				>
					<TagChip tag={tag.name} navigate={false} />
				</svelte:element>
			{/each}
		</div>
	{/if}
</div>

{#if selected}
	{#key selected.name}
		<TagNavigator
			name={selected.name}
			positions={selected.positions}
			{onNavigate}
			onClose={() => (selectedName = null)}
		/>
	{/key}
{/if}
