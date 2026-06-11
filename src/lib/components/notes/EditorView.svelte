<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';
	import { notesService, type Note } from '$lib/services/notes.svelte';
	import Editor from './Editor.svelte';

	let {
		note,
		onSave,
		children
	}: { note: Note; onSave?: (content: string) => Promise<void>; children?: Snippet } = $props();

	let saveTimer: ReturnType<typeof setTimeout>;
	let pending: string | null = null;

	function save(content: string): Promise<void> {
		return onSave ? onSave(content) : notesService.update(note.id, content);
	}

	// Flush (not drop) any pending save so edits made within the debounce
	// window survive switching notes or closing the window.
	onDestroy(() => {
		clearTimeout(saveTimer);
		if (pending !== null) void save(pending);
	});

	function handleChange(val: string) {
		clearTimeout(saveTimer);
		pending = val.replace(/[ \t]+$/gm, '');
		saveTimer = setTimeout(async () => {
			const content = pending;
			pending = null;
			if (content !== null) await save(content);
		}, 500);
	}
</script>

<div class="relative h-full overflow-y-auto">
	{#key note.id}
		{#await note.content ?? notesService.loadContent(note.id) then content}
			<Editor {content} autofocus onchange={handleChange} />
		{/await}
	{/key}
	{@render children?.()}
</div>
