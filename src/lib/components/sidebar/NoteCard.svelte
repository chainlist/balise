<script lang="ts">
	import type { Note } from '$lib/models/note';
	import NotePreview from '$lib/components/notes/NotePreview.svelte';
	import * as m from '$paraglide/messages.js';

	const intl = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'short' });

	let {
		note,
		active,
		onclick
	}: {
		note: Note;
		active: boolean;
		onclick: () => void;
	} = $props();
</script>

<button
	type="button"
	{onclick}
	class="flex shrink-0 flex-col items-start gap-2 overflow-hidden rounded border-2 border-transparent bg-primary/5 px-3 py-2 text-left transition-colors hover:rounded-l-none hover:bg-surface-container-low {active
		? 'rounded-l-none border-l-primary bg-surface-container-low'
		: 'hover:border-l-primary/40'}"
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
		{intl.format(new Date(note.updated_at))}
	</span>
</button>
