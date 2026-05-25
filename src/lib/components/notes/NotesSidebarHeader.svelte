<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { PlusIcon, XIcon, ListFilter, TagIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { tagsService, tagDisplayName } from '$lib/services/tags.svelte';
	import TagName from '$lib/components/TagName.svelte';
	import * as m from '$paraglide/messages.js';

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
			<TagName tag={uiState.activeTag || m.all_notes()} />
		</span>

		<div class="flex items-center">
			<Button variant="ghost" onclick={onCreate}><PlusIcon /></Button>
			<DropdownMenu.Root
				onOpenChange={(open) => {
					if (!open) tagSearch = '';
				}}
			>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="ghost" size="icon-sm" {...props}>
							<ListFilter class="size-4" />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width) rounded" align="end">
					<div role="presentation" class="p-2" onpointerdown={(e) => e.stopPropagation()}>
						<Input bind:value={tagSearch} placeholder={m.search_tags_placeholder()} class="h-7 text-xs" />
					</div>
					<DropdownMenu.Separator />
					<div class="max-h-60 overflow-auto">
						{#each filteredRelatedTags as tag (tag.tag)}
							<DropdownMenu.Item onclick={() => uiState.toggleComposedTag(tag.tag)} class="rounded">
								<TagName {tag} />
							</DropdownMenu.Item>
						{:else}
							<p class="px-3 py-2 text-center text-xs text-muted-foreground">{m.no_tags_found()}</p>
						{/each}
					</div>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
	{#if uiState.composedTags.length > 0}
		<div class="flex flex-wrap gap-1 px-2 pb-1">
			{#each uiState.composedTags as t (t)}
				<button
					type="button"
					onclick={() => uiState.toggleComposedTag(t)}
					class="flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-sm font-medium transition-colors hover:bg-muted/70"
					style={tagColor(t) ? `border-color: ${tagColor(t)};` : ''}
				>
					<TagName tag={t} />
				</button>
			{/each}
		</div>
	{/if}
</Sidebar.Header>
