<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { PlusIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { noteState, createNote, type Note } from '$lib/services/notes.svelte';
	import { uiState, toggleComposedTag } from '$lib/services/ui-state.svelte';
	import { tagState, tagDisplayName } from '$lib/services/tags.svelte';
	import { XIcon } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import { TagIcon } from '@lucide/svelte';

	let { children }: { children: Snippet<[Note | null]> } = $props();

	let selection = $state<{ noteId: string; tag: string | null; composedKey: string } | null>(null);
	const composedKey = $derived([...uiState.composedTags].sort().join('\x00'));
	const selectedNoteId = $derived(
		selection?.tag === uiState.activeTag && selection?.composedKey === composedKey
			? selection.noteId
			: (noteState.notes[0]?.id ?? null)
	);
	const selectedNote = $derived(noteState.notes.find((n) => n.id === selectedNoteId) ?? null);

	async function handleCreateNote() {
		const id = await createNote('### New Note');
		selection = { noteId: id, tag: uiState.activeTag, composedKey };
	}

	function tagColor(t: string): string | null {
		return tagState.tags.find((tag) => tag.tag === t)?.color ?? null;
	}

	let tagSearch = $state('');
	const filteredRelatedTags = $derived(
		tagSearch.trim()
			? tagState.relatedTags.filter((t) =>
					tagDisplayName(t).toLowerCase().includes(tagSearch.toLowerCase())
				)
			: tagState.relatedTags
	);

	const intl = new Intl.DateTimeFormat(navigator.language, {
		dateStyle: 'short',
		timeStyle: 'short'
	});
</script>

<Sidebar.Provider class="h-full min-h-0">
	<Sidebar.Root collapsible="none">
		<Sidebar.Header>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton size="lg" onclick={handleCreateNote}>
						<div class="flex items-center justify-between px-1">
							<span class="text-sm font-semibold">{uiState.activeTag}</span>
							<Button variant="ghost" size="icon-sm">
								<PlusIcon class="size-4" />
							</Button>
						</div>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
			{#if uiState.composedTags.length > 0}
				<div class="flex flex-wrap gap-1 px-2 pb-1">
					{#each uiState.composedTags as t (t)}
						<button
							type="button"
							onclick={() => toggleComposedTag(t)}
							class="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted/70"
						>
							<span
								class="size-1.5 shrink-0 rounded-full bg-primary"
								style={tagColor(t) ? `background: ${tagColor(t)};` : ''}
							></span>
							{tagDisplayName(
								tagState.tags.find((tag) => tag.tag === t) ?? { tag: t, display_name: null }
							)}
							<XIcon class="size-2.5 text-muted-foreground" />
						</button>
					{/each}
				</div>
			{/if}
			{#if tagState.relatedTags.length > 0}
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
							{#each filteredRelatedTags as tag (tag.tag)}
								<DropdownMenu.Item onclick={() => toggleComposedTag(tag.tag)}>
									<span
										class="size-2 shrink-0 rounded-full bg-primary"
										style={tag.color ? `background: ${tag.color};` : ''}
									></span>
									{tagDisplayName(tag)}
								</DropdownMenu.Item>
							{:else}
								<p class="px-3 py-2 text-center text-xs text-muted-foreground">No tags found.</p>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}
		</Sidebar.Header>

		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#if noteState.notes.length === 0}
							<p class="px-2 py-6 text-center text-sm text-muted-foreground">No notes yet.</p>
						{:else}
							{#each noteState.notes as note (note.id)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton
										isActive={selectedNoteId === note.id}
										onclick={() =>
											(selection = { noteId: note.id, tag: uiState.activeTag, composedKey })}
										class="h-auto py-2"
									>
										<div class="flex min-w-0 flex-col items-start gap-0.5">
											<span class="w-full truncate text-sm font-medium">
												{note.content.split('\n')[0] || 'Empty note'}
											</span>
											<span class="text-xs text-muted-foreground">
												{intl.format(new Date(note.updated_at))}
											</span>
										</div>
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						{/if}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>
	</Sidebar.Root>

	<Sidebar.Inset class="h-full min-h-0 w-full">
		{@render children(selectedNote)}
	</Sidebar.Inset>
</Sidebar.Provider>
