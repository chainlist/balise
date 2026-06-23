<script lang="ts">
	import { marked } from 'marked';
	import { TASK_STATUS_COLOR } from '$lib/domain/task';

	export type TaskStatus = 'todo' | 'done' | 'inprogress';

	let {
		status,
		text,
		onToggle,
		onEdit
	}: {
		status: TaskStatus;
		text: string;
		onToggle: () => void;
		onEdit?: (newText: string) => void;
	} = $props();

	let editing = $state(false);
	let editValue = $state('');
	let inputEl = $state<HTMLInputElement | undefined>(undefined);

	$effect(() => {
		if (editing && inputEl) inputEl.focus();
	});

	function startEdit(e: MouseEvent) {
		e.stopPropagation();
		editValue = text;
		editing = true;
	}

	function commitEdit() {
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== text) onEdit?.(trimmed);
		editing = false;
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitEdit();
		} else if (e.key === 'Escape') {
			editing = false;
		}
	}

	const LABEL: Record<TaskStatus, string> = { todo: 'To Do', done: 'Done', inprogress: 'In Progress' };

	let renderedText = $derived(marked.parseInline(text) as string);

	const color = $derived(TASK_STATUS_COLOR[status]);
	const bg = $derived(`color-mix(in oklch, ${color} 10%, transparent)`);
	const border = $derived(`color-mix(in oklch, ${color} 40%, transparent)`);
	const label = $derived(LABEL[status]);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="group my-1 flex w-full cursor-pointer items-center gap-3 rounded border px-3 py-2"
	style="background: {bg}; border-color: {border};"
	onclick={onToggle}
>
	<div
		role="checkbox"
		aria-checked={status === 'done'}
		aria-label={label}
		class="flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors"
		style="border-color: {border}; background: {status === 'done' ? border : 'transparent'};"
	>
		{#if status === 'done'}
			<svg class="size-2.5 text-white" viewBox="0 0 10 10" fill="none">
				<path
					d="M1.5 5L4 7.5L8.5 2.5"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{:else if status === 'inprogress'}
			<svg class="size-2" viewBox="0 0 8 8" fill="currentColor" style="color: {border}">
				<circle cx="4" cy="4" r="3" />
			</svg>
		{/if}
	</div>

	<span
		class="flex-1 leading-snug"
		class:line-through={status === 'done'}
		class:opacity-60={status === 'done'}
	>
		{#if editing}
			<input
				bind:this={inputEl}
				bind:value={editValue}
				onblur={commitEdit}
				onkeydown={handleKey}
				onclick={(e) => e.stopPropagation()}
				class="w-full bg-transparent outline-none"
			/>
		{:else}
			{@html renderedText}
		{/if}
	</span>

	{#if onEdit && !editing}
		<button
			type="button"
			onclick={startEdit}
			aria-label="Edit task"
			class="opacity-0 transition-opacity group-hover:opacity-60 hover:opacity-100!"
		>
			<svg
				class="size-3.5"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z" stroke-linejoin="round" />
			</svg>
		</button>
	{/if}
</div>
