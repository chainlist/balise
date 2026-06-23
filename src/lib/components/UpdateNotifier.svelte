<script lang="ts">
	import { onMount } from 'svelte';
	import { updaterService } from '$lib/core/services/updater.svelte';
	import * as m from '$paraglide/messages.js';

	let dismissed = $state(false);

	onMount(() => {
		updaterService.checkOnStartup();
	});
</script>

{#if !dismissed && updaterService.status !== 'idle' && updaterService.status !== 'up_to_date' && updaterService.status !== 'error' && updaterService.status !== 'checking'}
	<div
		class="frost-surface fixed top-4 right-4 z-50 flex w-72 flex-col gap-2 rounded p-4 text-sm shadow-lg"
	>
		{#if updaterService.status === 'available'}
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="font-medium">{m.updater_available_title()}</p>
					<p class="text-muted-foreground">v{updaterService.updateInfo?.version}</p>
				</div>
				<button
					class="text-muted-foreground hover:text-foreground"
					onclick={() => (dismissed = true)}
					aria-label={m.updater_dismiss()}>✕</button
				>
			</div>
			<button
				class="rounded bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
				onclick={() => updaterService.install()}
			>
				{m.updater_action_install()}
			</button>
		{:else if updaterService.status === 'downloading'}
			<p class="font-medium">{m.updater_downloading()}</p>
			<div class="h-1.5 w-full rounded-full bg-muted">
				<div
					class="h-1.5 rounded-full bg-primary transition-all"
					style="width: {updaterService.progress}%"
				></div>
			</div>
			<p class="text-right text-muted-foreground">{updaterService.progress}%</p>
		{:else if updaterService.status === 'done'}
			<p class="font-medium">{m.updater_installed()}</p>
			<p class="text-muted-foreground">{m.updater_restarting()}</p>
		{/if}
	</div>
{/if}
