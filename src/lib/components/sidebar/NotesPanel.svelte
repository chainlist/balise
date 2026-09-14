<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { notesService, newNoteContent } from '$lib/services/notes.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { formatDate } from '$lib/domain/datetime';
	import { tagsService } from '$lib/services/tags.svelte';
	import { eventBus } from '$lib/services/events/event-bus';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import TagName from '$lib/components/TagName.svelte';
	import NoteCard from '$lib/components/sidebar/NoteCard.svelte';
	import type { NoteListItem } from '$lib/domain/note';
	import { PINNED_FILTER, UNTAGGED_FILTER } from '$lib/domain/tag';
	import TagFilterDropdown from '$lib/components/sidebar/TagFilterDropdown.svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { PlusIcon, XIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	// Pinned notes get their own group at the top; the rest follow. The service
	// already sorts pinned-first, so each filter keeps its group's order.
	const pinnedNotes = $derived(notesService.notes.filter((n) => n.pinned));
	const otherNotes = $derived(notesService.notes.filter((n) => !n.pinned));

	// A sentinel filter is not a real tag, so it has no display name to look up.
	const panelTitle = $derived(
		uiState.activeTag === PINNED_FILTER
			? m.nav_pinned()
			: uiState.activeTag === UNTAGGED_FILTER
				? m.nav_untagged()
				: uiState.activeTag
	);

	// Matches the group headings in Sidebar.svelte, minus the horizontal padding
	// the list container already applies.
	const SECTION_LABEL =
		'pt-2 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase';

	function tagColor(t: string): string | null {
		return tagsService.tags.find((tag) => tag.tag === t)?.color ?? null;
	}

	const dayLabel = $derived(
		uiState.activeDay
			? formatDate(
					uiState.activeDay,
					settingsService.general.state.dateFormat,
					settingsService.general.state.language
				)
			: null
	);

	async function handleCreate() {
		let id: string;
		try {
			id = await notesService.create(newNoteContent(uiState.activeTag));
		} catch (e) {
			toasterService.error(m.note_create_error_failed(), errorMessage(e));
			return;
		}
		uiState.setActiveNote(id);
		if (page.url.pathname !== '/') await goto(resolve('/'));
	}

	async function handleSelect(noteId: string) {
		uiState.setActiveNote(noteId);
		if (page.url.pathname !== '/') await goto(resolve('/'));
	}

	$effect(() =>
		eventBus.notes.select.on(async (id) => {
			uiState.setActiveNote(id);
			if (page.url.pathname !== '/') await goto(resolve('/'));
		})
	);
</script>

<div class="frost flex h-full min-h-0 flex-col">
	<div class="flex items-center justify-between gap-1 px-3 pt-3 pb-2">
		{#if uiState.activeDay}
			<span class="text-md flex h-6 min-w-0 items-center gap-1 font-medium text-on-surface">
				<span class="truncate capitalize">{dayLabel}</span>
				<Button
					variant="ghost"
					size="icon-xs"
					onclick={() => uiState.setActiveDay(null)}
					aria-label={m.journal_clear_day_filter()}
					title={m.journal_clear_day_filter()}
					class="h-5 w-5 shrink-0 text-sidebar-foreground/60 hover:text-on-surface"
				>
					<XIcon class="size-3.5" />
				</Button>
			</span>
		{:else}
			<span class="text-md flex h-6 min-w-0 items-center font-medium text-on-surface">
				<TagName tag={panelTitle || m.all_notes()} />
			</span>
		{/if}
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

	{#if uiState.composedTags.length > 0}
		<div class="flex flex-wrap items-center gap-1 px-3 pb-2">
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

	{#snippet noteCards(items: NoteListItem[])}
		{#each items as note (note.id)}
			<NoteCard
				{note}
				active={uiState.activeNoteId === note.id}
				onclick={() => handleSelect(note.id)}
			/>
		{/each}
	{/snippet}

	<div class="flex scrollbar-thin flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
		{#if notesService.notes.length === 0}
			<p class="px-2 py-6 text-center text-sm text-muted-foreground">{m.no_notes_yet()}</p>
		{:else if pinnedNotes.length > 0 && otherNotes.length > 0}
			<p class={SECTION_LABEL}>{m.notes_section_pinned()}</p>
			{@render noteCards(pinnedNotes)}
			<p class={SECTION_LABEL}>{m.notes_section_other()}</p>
			{@render noteCards(otherNotes)}
		{:else}
			{@render noteCards(notesService.notes)}
		{/if}
	</div>
</div>
