<script lang="ts">
	import type { NoteListItem } from '$lib/core/domain/note';
	import NotePreview from '$lib/components/notes/NotePreview.svelte';
	import { parseDbTimestamp } from '$lib/core/domain/shared/time';
	import { settingsService } from '$lib/core/services/settings/settings.svelte';
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
</script>

<button
	type="button"
	{onclick}
	class="flex shrink-0 flex-col items-start gap-2 overflow-hidden px-3 py-2 text-left transition-colors {active
		? 'relative frost-selected before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:animate-[accent-grow_150ms_ease-out] before:rounded-full before:bg-primary'
		: 'rounded border border-transparent bg-primary/5 hover:frost-selected'}"
>
	<div class="flex w-full min-w-0 flex-col gap-2">
		<span class="truncate text-sm font-semibold text-on-surface">
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
</button>
