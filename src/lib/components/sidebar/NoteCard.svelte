<script lang="ts">
	import type { NoteListItem } from '$lib/domain/note';
	import NotePreview from '$lib/components/notes/NotePreview.svelte';
	import { parseDbTimestamp } from '$lib/domain/shared/time';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { notesService } from '$lib/services/notes.svelte';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import { PinIcon, PinOffIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	const intl = $derived(
		new Intl.DateTimeFormat(settingsService.general.state.language, { dateStyle: 'short' })
	);

	let {
		note,
		active,
		onclick
	}: {
		note: NoteListItem;
		active: boolean;
		onclick: () => void;
	} = $props();

	const pinLabel = $derived(note.pinned ? m.note_unpin() : m.note_pin());

	// The card itself is a <button>, so the pin control cannot be one too. Same
	// role/tabindex treatment as the tag settings affordance in TagSidebarItem.
	async function togglePinned(event: Event) {
		event.stopPropagation();
		try {
			await notesService.setPinned(note.id, !note.pinned);
		} catch (e) {
			toasterService.error(m.note_pin_error_failed(), errorMessage(e));
		}
	}
</script>

<button
	type="button"
	{onclick}
	class="group/note-card relative flex shrink-0 flex-col items-start gap-2 overflow-hidden px-3 py-2 text-left transition-colors {active
		? 'frost-selected before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:animate-[accent-grow_150ms_ease-out] before:rounded-full before:bg-primary'
		: 'rounded border border-transparent bg-primary/5 hover:frost-selected'}"
>
	<div class="flex w-full min-w-0 flex-col gap-2">
		<span class="truncate pr-5 text-sm font-semibold text-on-surface">
			{note.title || m.note_untitled()}
		</span>
		{#if note.preview}
			<div class="w-full text-xs text-muted-foreground">
				<NotePreview content={note.preview} />
			</div>
		{/if}
	</div>
	<span class="text-[11px] text-shadow-accent-foreground">
		{intl.format(new Date(parseDbTimestamp(note.updatedAt)))}
	</span>

	<div
		role="button"
		tabindex="0"
		aria-label={pinLabel}
		title={pinLabel}
		onclick={togglePinned}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				togglePinned(e);
			}
		}}
		class="absolute top-1.5 right-1.5 rounded p-0.5 text-sidebar-foreground/40 opacity-0 transition-opacity group-hover/note-card:opacity-100 hover:bg-sidebar-accent hover:text-on-surface focus-visible:opacity-100"
	>
		{#if note.pinned}
			<PinOffIcon class="size-3.5" />
		{:else}
			<PinIcon class="size-3.5" />
		{/if}
	</div>
</button>
