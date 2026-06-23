<script lang="ts">
	import { onDestroy, untrack, type Snippet } from 'svelte';
	import { notesService } from '$lib/services/notes.svelte';
	import type { NoteListItem } from '$lib/domain/note';
	import { tagsService } from '$lib/services/tags.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import { readingTimeMinutes } from '$lib/utils/note-utils';
	import { parseDbTimestamp } from '$lib/domain/shared/time';
	import Editor from './Editor.svelte';
	import EditorHeader from './EditorHeader.svelte';
	import * as m from '$paraglide/messages.js';

	let {
		note,
		onSave,
		persistFolds = true,
		autofocus = true,
		showHeader = true,
		children
	}: {
		note: NoteListItem & { content?: string };
		onSave?: (content: string) => Promise<void>;
		persistFolds?: boolean;
		autofocus?: boolean;
		showHeader?: boolean;
		children?: Snippet;
	} = $props();

	let saveTimer: ReturnType<typeof setTimeout>;
	let pending: string | null = null;
	let liveContent = $state<string | null>(null);
	let editor = $state<ReturnType<typeof Editor>>();

	// Resolve the content source once: the editor owns its document after mount, so a
	// later note.content change (e.g. a recycled journal draft) must not reload it.
	const initialContent = untrack(() => note.content ?? notesService.loadContent(note.id));

	export function getOutline() {
		return editor?.getOutline() ?? [];
	}

	export function goToPosition(pos: number, align: 'nearest' | 'start' = 'nearest') {
		editor?.goToPosition(pos, align);
	}

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
<div class="relative scrollbar-thin h-full overflow-y-auto">
	{#await initialContent then content}
		{#if showHeader}
			<EditorHeader
				readingTime={readingTimeMinutes(liveContent ?? content)}
				date={new Date(parseDbTimestamp(note.createdAt))}
				tags={tagsService.tagsForNote(liveContent ?? content)}
				onNavigate={(pos) => editor?.goToPosition(pos)}
			/>
		{/if}
		<Editor
			bind:this={editor}
			{content}
			{autofocus}
			initialFolds={persistFolds ? uiState.getNoteFolds(note.id) : []}
			onchange={handleChange}
			onfoldchange={persistFolds ? (folds) => uiState.setNoteFolds(note.id, folds) : undefined}
		/>
	{/await}
	{@render children?.()}
</div>
