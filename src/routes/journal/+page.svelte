<script lang="ts">
	import { Calendar } from '$lib/components/shadcn/calendar/index.js';
	import { today, getLocalTimeZone } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import { notesService } from '$lib/services/notes.svelte';
	import type { Note } from '$lib/repositories/notes.repo';
	import NoteEditor from '$lib/components/notes/NoteEditor.svelte';
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { uiState } from '$lib/services/ui-state.svelte';

	const JOURNAL_TAG = 'journal';

	let selectedDate = $state<DateValue | undefined>(today(getLocalTimeZone()));
	let journalNotes = $state<Note[]>([]);
	let draftNote = $state<Note | null>(null);
	const onSaveHandlers = new SvelteMap<string, (content: string) => Promise<void>>();

	const allNotes = $derived([...journalNotes, ...(draftNote ? [draftNote] : [])]);
	const hasMultipleNotes = $derived(allNotes.length > 1);

	function toJSDate(dv: DateValue): Date {
		return new Date(dv.year, dv.month - 1, dv.day);
	}

	function toDateStr(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	function journalNoteContent(date: Date): string {
		const formatted = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'full' }).format(
			date
		);
		return `### ${formatted}\n\n\n\n#${JOURNAL_TAG}`;
	}

	async function loadForDate(date: Date): Promise<void> {
		const dateStr = toDateStr(date);
		const notes = await notesService.queryForDate(date);
		onSaveHandlers.clear();

		if (notes.length > 0) {
			journalNotes = notes;
			draftNote = null;
		} else {
			const id = crypto.randomUUID();
			onSaveHandlers.set(id, async (content) => {
				await notesService.createForDate(id, content, date);
				onSaveHandlers.delete(id);
			});
			draftNote = {
				id,
				content: journalNoteContent(date),
				title: '',
				pinned: false,
				archived: false,
				created_at: `${dateStr} 00:00:00`,
				updated_at: `${dateStr} 00:00:00`
			};
			journalNotes = [];
		}
	}

	onMount(() => {
		uiState.setActiveTag(null);
	});

	$effect(() => {
		if (selectedDate) loadForDate(toJSDate(selectedDate));
	});
</script>

<div class="relative h-full">
	<div class="absolute top-4 left-4 z-10 overflow-hidden rounded-lg border bg-background shadow-md">
		<Calendar type="single" bind:value={selectedDate} locale={navigator.language} />
	</div>

	<div class="h-full space-y-8 overflow-y-auto pb-16">
		{#each allNotes as note (note.id)}
			<div class="relative" class:h-full={!hasMultipleNotes} class:min-h-min={hasMultipleNotes}>
				{#key note.id}
					<NoteEditor {note} onSave={onSaveHandlers.get(note.id)} />
				{/key}
				<div
					class="absolute bottom-0 left-0 h-px w-full
           bg-linear-to-r
           from-transparent
           via-primary/20
           to-transparent"
				></div>
			</div>
		{/each}
	</div>
</div>
