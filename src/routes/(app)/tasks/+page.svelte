<script lang="ts">
	import { onMount } from 'svelte';
	import { tasksService } from '$lib/services/tasks.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { desksService } from '$lib/services/desks.svelte';
	import TaskBoard from '$lib/components/tasks/TaskBoard.svelte';
	import * as m from '$paraglide/messages.js';

	let loaded = $state(false);

	let prevDesk = desksService.activeDesk;
	$effect(() => {
		const desk = desksService.activeDesk;
		if (desk !== prevDesk) {
			prevDesk = desk;
			tasksService.load();
		}
	});

	onMount(async () => {
		uiState.setActiveTag(null);
		await tasksService.load();
		loaded = true;
	});
</script>

<div class="h-full w-full">
	{#if !loaded}
		<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
			{m.tasks_loading()}
		</div>
	{:else if tasksService.tasks.length === 0}
		<div
			class="flex h-full items-center justify-center px-8 text-center text-sm text-muted-foreground"
		>
			{m.tasks_empty()}
		</div>
	{:else}
		<TaskBoard />
	{/if}
</div>
