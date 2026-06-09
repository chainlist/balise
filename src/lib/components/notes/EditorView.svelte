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

	onDestroy(() => clearTimeout(saveTimer));

	function handleChange(val: string) {
		clearTimeout(saveTimer);
		const trimmed = val.replace(/[ \t]+$/gm, '');
		saveTimer = setTimeout(async () => {
			if (onSave) await onSave(trimmed);
			else await notesService.update(note.id, trimmed);
		}, 500);
	}
</script>

<div class="relative h-full overflow-y-auto">
	{#key note.id}
		{#await notesService.loadContent(note.id) then content}
			<Editor {content} autofocus onchange={handleChange} />
		{/await}
	{/key}
	{@render children?.()}
</div>
