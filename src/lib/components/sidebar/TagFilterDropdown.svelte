<script lang="ts">
	import { tagsService, tagDisplayName } from '$lib/services/tags.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ListFilter } from '@lucide/svelte';
	import TagName from '$lib/components/TagName.svelte';
	import * as m from '$paraglide/messages.js';

	let tagSearch = $state('');
	const filteredRelatedTags = $derived(
		tagSearch.trim()
			? tagsService.relatedTags.filter((t) =>
					tagDisplayName(t).toLowerCase().includes(tagSearch.toLowerCase())
				)
			: tagsService.relatedTags
	);
</script>

<DropdownMenu.Root
	onOpenChange={(open) => {
		if (!open) tagSearch = '';
	}}
>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				variant="ghost"
				size="icon-sm"
				{...props}
				class="h-6 w-6 text-sidebar-foreground/60 hover:text-on-surface"
			>
				<ListFilter class="size-4" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-56 rounded bg-sidebar" align="end" side="bottom">
		<div role="presentation" class="p-2" onpointerdown={(e) => e.stopPropagation()}>
			<Input
				bind:value={tagSearch}
				placeholder={m.search_tags_placeholder()}
				class="h-7 text-xs"
			/>
		</div>
		<DropdownMenu.Separator />
		<div class="max-h-60 overflow-auto">
			{#each filteredRelatedTags as tag (tag.tag)}
				<DropdownMenu.Item
					onclick={() => uiState.toggleComposedTag(tag.tag)}
					class="rounded dark:focus:bg-surface-container-high"
				>
					<TagName {tag} />
				</DropdownMenu.Item>
			{:else}
				<p class="px-3 py-2 text-center text-xs text-muted-foreground">{m.no_tags_found()}</p>
			{/each}
		</div>
	</DropdownMenu.Content>
</DropdownMenu.Root>
