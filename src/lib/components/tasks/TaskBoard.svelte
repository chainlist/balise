<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { tasksService, type TaskItem, type TaskStatus } from '$lib/services/tasks.svelte';
	import TaskBoardCard from './TaskBoardCard.svelte';
	import * as m from '$paraglide/messages.js';

	const FLIP_MS = 200;
	const ORDER: TaskStatus[] = ['todo', 'inprogress', 'done'];
	const LABELS: Record<TaskStatus, () => string> = {
		todo: m.tasks_status_todo,
		inprogress: m.tasks_status_inprogress,
		done: m.tasks_status_done
	};
	const ACCENT: Record<TaskStatus, string> = {
		todo: 'oklch(0.65 0.18 240)',
		inprogress: 'oklch(0.75 0.18 85)',
		done: 'oklch(0.65 0.18 145)'
	};

	let columns = $state<Record<TaskStatus, TaskItem[]>>({ todo: [], inprogress: [], done: [] });

	$effect(() => {
		const next: Record<TaskStatus, TaskItem[]> = { todo: [], inprogress: [], done: [] };
		for (const t of tasksService.tasks) next[t.status].push(t);
		columns = next;
	});

	function handleConsider(status: TaskStatus, e: CustomEvent<DndEvent<TaskItem>>) {
		columns[status] = e.detail.items;
	}

	function handleFinalize(status: TaskStatus, e: CustomEvent<DndEvent<TaskItem>>) {
		const incoming = e.detail.items.find((item) => item.status !== status);
		columns[status] = e.detail.items;

		if (!incoming) return;

		if (incoming.source === 'checklist' && status === 'inprogress') {
			tasksService.load();
			return;
		}

		tasksService.moveTask(incoming, status);
	}
</script>

<div class="grid h-full grid-cols-3 gap-4 overflow-hidden p-6">
	{#each ORDER as status (status)}
		<section class="flex min-h-0 flex-col rounded-lg border bg-card">
			<header
				class="flex items-center justify-between border-b px-4 py-3"
				style="border-color: color-mix(in oklch, {ACCENT[status]} 25%, transparent);"
			>
				<div class="flex items-center gap-2">
					<span
						class="size-2 rounded-full"
						style="background: {ACCENT[status]};"
						aria-hidden="true"
					></span>
					<h2 class="text-sm font-semibold">{LABELS[status]()}</h2>
				</div>
				<span class="text-xs text-muted-foreground">{columns[status].length}</span>
			</header>
			<div
				class="zone flex-1 space-y-2 overflow-y-auto p-3"
				use:dndzone={{
					items: columns[status],
					type: 'task',
					flipDurationMs: FLIP_MS,
					dropTargetStyle: { outline: `2px dashed ${ACCENT[status]}` }
				}}
				onconsider={(e) => handleConsider(status, e)}
				onfinalize={(e) => handleFinalize(status, e)}
			>
				{#each columns[status] as task (task.id)}
					<div animate:flip={{ duration: FLIP_MS }}>
						<TaskBoardCard {task} />
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>
