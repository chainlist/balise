<script lang="ts">
	export type TaskStatus = 'todo' | 'done' | 'inprogress';

	let {
		status,
		text,
		onToggle
	}: {
		status: TaskStatus;
		text: string;
		onToggle: () => void;
	} = $props();

	const canToggle = $derived(status === 'todo' || status === 'done');

	const styles: Record<TaskStatus, { bg: string; border: string; label: string }> = {
		todo: {
			bg: 'color-mix(in oklch, oklch(0.65 0.18 240) 10%, transparent)',
			border: 'color-mix(in oklch, oklch(0.65 0.18 240) 40%, transparent)',
			label: 'To Do'
		},
		done: {
			bg: 'color-mix(in oklch, oklch(0.65 0.18 145) 10%, transparent)',
			border: 'color-mix(in oklch, oklch(0.65 0.18 145) 40%, transparent)',
			label: 'Done'
		},
		inprogress: {
			bg: 'color-mix(in oklch, oklch(0.75 0.18 85) 10%, transparent)',
			border: 'color-mix(in oklch, oklch(0.75 0.18 85) 40%, transparent)',
			label: 'In Progress'
		}
	};

	const { bg, border, label } = $derived(styles[status]);
</script>

<div
	role="listitem"
	class="my-1 flex w-full items-center gap-3 rounded border px-3 py-2 text-sm"
	style="background: {bg}; border-color: {border};"
>
	<button
		type="button"
		role="checkbox"
		aria-checked={status === 'done'}
		aria-label={label}
		class="flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors"
		style="border-color: {border}; background: {status === 'done' ? border : 'transparent'};"
		onclick={canToggle ? onToggle : undefined}
		disabled={!canToggle}
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
	</button>

	<span
		class="flex-1 leading-snug"
		class:line-through={status === 'done'}
		class:opacity-60={status === 'done'}
	>
		{text}
	</span>

	<span
		class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
		style="color: {border}; background: {bg}; border: 1px solid {border};"
	>
		{label}
	</span>
</div>
