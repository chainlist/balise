<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';
	import { notesService, type Note } from '$lib/services/notes.svelte';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import { readingTimeMinutes } from '$lib/utils/note-utils';
	import { parseDbTimestamp } from '$lib/utils/time';
	import Editor from './Editor.svelte';
	import EditorHeader from './EditorHeader.svelte';
	import * as m from '$paraglide/messages.js';

	let {
		note,
		onSave,
		children
	}: { note: Note; onSave?: (content: string) => Promise<void>; children?: Snippet } = $props();

	let saveTimer: ReturnType<typeof setTimeout>;
	let pending: string | null = null;
	let liveContent = $state<string | null>(null);

	async function save(content: string): Promise<void> {
		try {
			await (onSave ? onSave(content) : notesService.update(note.id, content));
		} catch (e) {
			toasterService.error(m.note_save_error_failed(), errorMessage(e));
		}
	}

	// Flush (not drop) any pending save so edits made within the debounce
	// window survive switching notes or closing the window.
	onDestroy(() => {
		clearTimeout(saveTimer);
		if (pending !== null) void save(pending);
	});

	function handleChange(val: string) {
		clearTimeout(saveTimer);
		liveContent = val;
		pending = val.replace(/[ \t]+$/gm, '');
		saveTimer = setTimeout(async () => {
			const content = pending;
			pending = null;
			if (content !== null) await save(content);
		}, 500);
	}
</script>

<!-- Consumers remount this component per note (keyed by note.id), so the
     debounce timer, pending flush, and loaded content all belong to one note. -->
<div class="relative h-full overflow-y-auto">
	{#await note.content ?? notesService.loadContent(note.id) then content}
		<EditorHeader
			readingTime={readingTimeMinutes(liveContent ?? content)}
			date={new Date(parseDbTimestamp(note.created_at))}
		/>
		<Editor {content} autofocus onchange={handleChange} />
	{/await}
	{@render children?.()}
</div>
