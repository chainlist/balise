<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { notesService } from '$lib/services/notes.svelte';
	import { noteSelection } from '$lib/services/note-selection.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { tagsService, tagDisplayName } from '$lib/services/tags.svelte';
	import TagName from '$lib/components/TagName.svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Input } from '$lib/components/shadcn/input/index.js';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { ListFilter, PlusIcon, XIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import NotePreview from '$lib/components/notes/NotePreview.svelte';

	const intl = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'short' });

	let tagSearch = $state('');
	const filteredRelatedTags = $derived(
		tagSearch.trim()
			? tagsService.relatedTags.filter((t) =>
					tagDisplayName(t).toLowerCase().includes(tagSearch.toLowerCase())
				)
			: tagsService.relatedTags
	);

	function tagColor(t: string): string | null {
		return tagsService.tags.find((tag) => tag.tag === t)?.color ?? null;
	}

	async function handleCreate() {
		await noteSelection.createNew();
		if (page.url.pathname !== '/') await goto(resolve('/'));
	}

	async function handleSelect(noteId: string) {
		noteSelection.select(noteId);
		if (page.url.pathname !== '/') await goto(resolve('/'));
	}

	function clearActiveTag() {
		uiState.setActiveTag(null);
	}
</script>

<div class="flex items-center justify-between gap-1 px-3 pt-1 pb-2">
	<span class="truncate text-sm font-medium text-on-surface">
		<TagName tag={uiState.activeTag || m.all_notes()} />
	</span>
	<div class="flex items-center">
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={handleCreate}
			aria-label={m.shortcut_new_note_name()}
			class="h-6 w-6 text-sidebar-foreground/60 hover:text-on-surface"
		>
			<PlusIcon class="size-4" />
		</Button>
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
			<DropdownMenu.Content class="w-56 rounded" align="start" side="right">
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

{#if uiState.activeTag || uiState.composedTags.length > 0}
	<div class="flex flex-wrap items-center gap-1 px-3 pb-2">
		{#if uiState.activeTag}
			<button
				type="button"
				onclick={clearActiveTag}
				class="group inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/70"
				style={tagColor(uiState.activeTag) ? `border-color: ${tagColor(uiState.activeTag)};` : ''}
			>
				<TagName tag={uiState.activeTag} />
				<XIcon class="size-3 opacity-50 group-hover:opacity-100" />
			</button>
		{/if}
		{#each uiState.composedTags as t (t)}
			<button
				type="button"
				onclick={() => uiState.toggleComposedTag(t)}
				class="group inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/70"
				style={tagColor(t) ? `border-color: ${tagColor(t)};` : ''}
			>
				<TagName tag={t} />
				<XIcon class="size-3 opacity-50 group-hover:opacity-100" />
			</button>
		{/each}
	</div>
{/if}

<div class="flex flex-1 scrollbar-none flex-col gap-2 overflow-y-auto px-3 pb-3">
	{#if notesService.notes.length === 0}
		<p class="px-2 py-6 text-center text-sm text-muted-foreground">{m.no_notes_yet()}</p>
	{:else}
		{#each notesService.notes as note (note.id)}
			<button
				type="button"
				onclick={() => handleSelect(note.id)}
				class="flex flex-col items-start gap-2 rounded border-2 border-transparent bg-primary/5 px-3 py-2 text-left transition-colors hover:rounded-l-none hover:bg-surface-container-low {noteSelection.selectedNoteId ===
				note.id
					? 'rounded-l-none border-l-primary bg-surface-container-low'
					: 'hover:border-l-primary/40'}"
			>
				<div class="flex flex-col gap-2">
					<span class="w-full truncate text-sm font-semibold text-on-surface">
						{note.title || m.note_untitled()}
					</span>
					{#if note.preview}
						<div class="w-full text-xs text-muted-foreground">
							<NotePreview content={note.preview} />
						</div>
					{/if}
				</div>
				<span class="text-[11px] text-shadow-accent-foreground">
					{intl.format(new Date(note.updated_at))}
				</span>
			</button>
		{/each}
	{/if}
</div>
