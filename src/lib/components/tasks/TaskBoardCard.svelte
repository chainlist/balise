<script lang="ts">
	import { marked } from 'marked';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { TASK_STATUS_COLOR, type TaskItem } from '$lib/domain/task';
	import * as m from '$paraglide/messages.js';

	let { task }: { task: TaskItem } = $props();

	const renderedText = $derived(marked.parseInline(task.text) as string);
	const color = $derived(TASK_STATUS_COLOR[task.status]);
	const bg = $derived(`color-mix(in oklch, ${color} 10%, transparent)`);
	const border = $derived(`color-mix(in oklch, ${color} 40%, transparent)`);
	const isChecklist = $derived(task.source === 'checklist');

	function openNote() {
		uiState.setActiveNote(task.noteId);
		goto(resolve('/'));
	}
</script>

<button
	type="button"
	onclick={openNote}
	class="task-card group flex w-full cursor-grab flex-col gap-1.5 rounded border px-3 py-2 text-left active:cursor-grabbing"
	class:dashed={isChecklist}
	style="background: {bg}; border-color: {border};"
>
	<div class="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
		{#if isChecklist}
			<span aria-hidden="true">{task.status === 'done' ? '☑' : '☐'}</span>
		{:else}
			<span aria-hidden="true">#</span>
		{/if}
		<span class="truncate">{task.noteTitle || m.note_untitled()}</span>
	</div>
	<div
		class="text-sm leading-snug"
		class:line-through={task.status === 'done'}
		class:opacity-60={task.status === 'done'}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html renderedText}
	</div>
</button>

<style>
	.task-card.dashed {
		border-style: dashed;
	}
</style>
