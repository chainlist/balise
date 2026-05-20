<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { PlusIcon, XIcon, TagIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { notesService } from '$lib/services/notes.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { tagsService, tagDisplayName } from '$lib/services/tags.svelte';
	import TagName from '$lib/components/TagName.svelte';

	let { onCreate }: { onCreate: () => void } = $props();

	function tagColor(t: string): string | null {
		return tagsService.tags.find((tag) => tag.tag === t)?.color ?? null;
	}

	let tagSearch = $state('');
	const filteredRelatedTags = $derived(
		tagSearch.trim()
			? tagsService.relatedTags.filter((t) =>
					tagDisplayName(t).toLowerCase().includes(tagSearch.toLowerCase())
				)
			: tagsService.relatedTags
	);
</script>

<Sidebar.Header class="border-b border-border pb-3">
	<div class="flex items-center justify-between px-2">
		<span class="text-lg font-semibold text-primary-container">
			<TagName tag={uiState.activeTag || 'All Notes'} />
		</span>
		<Button variant="ghost" size="icon-sm" onclick={onCreate}>
			<PlusIcon class="size-4" />
		</Button>
	</div>
	{#if tagsService.relatedTags.length > 0 && notesService.notes.length > 1}
		<div class="px-2 pb-1">
			<DropdownMenu.Root
				onOpenChange={(open) => {
					if (!open) tagSearch = '';
				}}
			>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							size="sm"
							class="w-full justify-start gap-2 text-xs font-normal text-muted-foreground"
						>
							<TagIcon class="size-3" />
							Filter by tag…
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width)">
					<div role="presentation" class="p-2" onpointerdown={(e) => e.stopPropagation()}>
						<Input bind:value={tagSearch} placeholder="Search tags…" class="h-7 text-xs" />
					</div>
					<DropdownMenu.Separator />
					<div class="max-h-60 overflow-auto">
						{#each filteredRelatedTags as tag (tag.tag)}
							<DropdownMenu.Item onclick={() => uiState.toggleComposedTag(tag.tag)}>
								<span
									class="size-2 shrink-0 rounded-full bg-primary"
									style={tag.color ? `background: ${tag.color};` : ''}
								></span>
								<TagName {tag} />
							</DropdownMenu.Item>
						{:else}
							<p class="px-3 py-2 text-center text-xs text-muted-foreground">No tags found.</p>
						{/each}
					</div>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}
	{#if uiState.composedTags.length > 0}
		<div class="flex flex-wrap gap-1 px-2 pb-1">
			{#each uiState.composedTags as t (t)}
				<button
					type="button"
					onclick={() => uiState.toggleComposedTag(t)}
					class="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted/70"
				>
					<span
						class="size-1.5 shrink-0 rounded-full bg-primary"
						style={tagColor(t) ? `background: ${tagColor(t)};` : ''}
					></span>
					<TagName tag={t} />
					<XIcon class="size-2.5 text-muted-foreground" />
				</button>
			{/each}
		</div>
	{/if}
</Sidebar.Header>
