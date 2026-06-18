<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';
	import { notesService, type Note } from '$lib/services/content/notes.svelte';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import { toasterService, errorMessage } from '$lib/services/app/toaster';
	import { readingTimeMinutes } from '$lib/utils/note-utils';
	import { groupHashtagOccurrences } from '$lib/utils/tag-parser';
	import { parseDbTimestamp } from '$lib/utils/time';
	import Editor from './Editor.svelte';
	import EditorHeader from './EditorHeader.svelte';
	import * as m from '$paraglide/messages.js';
	import { fade } from 'svelte/transition';

	let {
		note,
		onSave,
		persistFolds = true,
		children
	}: {
		note: Note;
		onSave?: (content: string) => Promise<void>;
		persistFolds?: boolean;
		children?: Snippet;
	} = $props();

	let saveTimer: ReturnType<typeof setTimeout>;
	let pending: string | null = null;
	let liveContent = $state<string | null>(null);
	let editor = $state<ReturnType<typeof Editor>>();

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
<div class="relative h-full overflow-y-auto scrollbar-thin">
	{#await note.content ?? notesService.loadContent(note.id) then content}
		<EditorHeader
			readingTime={readingTimeMinutes(liveContent ?? content)}
			date={new Date(parseDbTimestamp(note.created_at))}
			tags={groupHashtagOccurrences(liveContent ?? content)}
			onNavigate={(pos) => editor?.goToPosition(pos)}
		/>
		<Editor
			bind:this={editor}
			{content}
			autofocus
			initialFolds={persistFolds ? uiState.getNoteFolds(note.id) : []}
			onchange={handleChange}
			onfoldchange={persistFolds ? (folds) => uiState.setNoteFolds(note.id, folds) : undefined}
		/>
	{/await}
	{@render children?.()}
</div>
