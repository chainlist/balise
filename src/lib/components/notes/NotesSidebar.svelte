<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import type { Note } from '$lib/services/notes.svelte';
	import NotesSidebarHeader from '$lib/components/notes/NotesSidebarHeader.svelte';
	import NotesSidebarContent from '$lib/components/notes/NotesSidebarContent.svelte';

	let {
		notes,
		selectedNoteId,
		onCreate,
		onSelect
	}: {
		notes: Note[];
		selectedNoteId: string | null;
		onCreate: () => void;
		onSelect: (noteId: string) => void;
	} = $props();
</script>

<Sidebar.Root collapsible="none" class="border-r border-sidebar-border">
	<NotesSidebarHeader {onCreate} />
	<NotesSidebarContent {notes} {selectedNoteId} {onSelect} />
</Sidebar.Root>
