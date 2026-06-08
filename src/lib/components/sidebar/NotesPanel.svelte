<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { notesService, newNoteContent } from '$lib/services/notes.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { tagsService } from '$lib/services/tags.svelte';
	import { noteSignals } from '$lib/services/note-signals';
	import TagName from '$lib/components/TagName.svelte';
	import NoteCard from '$lib/components/sidebar/NoteCard.svelte';
	import TagFilterDropdown from '$lib/components/sidebar/TagFilterDropdown.svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { PlusIcon, XIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	function tagColor(t: string): string | null {
		return tagsService.tags.find((tag) => tag.tag === t)?.color ?? null;
	}

	async function handleCreate() {
		const id = await notesService.create(newNoteContent(uiState.activeTag));
		uiState.setActiveNote(id);
		if (page.url.pathname !== '/') await goto(resolve('/'));
	}

	async function handleSelect(noteId: string) {
		uiState.setActiveNote(noteId);
		if (page.url.pathname !== '/') await goto(resolve('/'));
	}

	function clearActiveTag() {
		uiState.setActiveTag(null);
	}

	$effect(() =>
		noteSignals.onSelectNote(async (id) => {
			uiState.setActiveNote(id);
			if (page.url.pathname !== '/') await goto(resolve('/'));
		})
	);
</script>

<div class="flex h-full min-h-0 flex-col bg-sidebar">
	<div class="flex items-center justify-between gap-1 px-3 pt-3 pb-2">
		<span class="text-md truncate font-medium text-on-surface">
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
			<TagFilterDropdown />
		</div>
	</div>

	{#if uiState.activeTag || uiState.composedTags.length > 0}
		<div class="flex flex-wrap items-center gap-1 px-3 pb-2">
			<!-- {#if uiState.activeTag}
				<button
					type="button"
					onclick={clearActiveTag}
					class="group inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-sm font-medium hover:bg-muted/70"
					style={tagColor(uiState.activeTag) ? `border-color: ${tagColor(uiState.activeTag)};` : ''}
				>
					<TagName tag={uiState.activeTag} />
					<XIcon class="size-3 opacity-50 group-hover:opacity-100" />
				</button>
			{/if} -->
			{#each uiState.composedTags as t (t)}
				<button
					type="button"
					onclick={() => uiState.toggleComposedTag(t)}
					class="group inline-flex items-center gap-1 rounded border bg-muted px-2 py-0.5 text-sm font-medium hover:bg-muted/70"
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
				<NoteCard
					{note}
					active={uiState.activeNoteId === note.id}
					onclick={() => handleSelect(note.id)}
				/>
			{/each}
		{/if}
	</div>
</div>
