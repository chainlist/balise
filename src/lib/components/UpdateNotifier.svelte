<script lang="ts">
	import { onMount } from 'svelte';
	import { check, type Update } from '@tauri-apps/plugin-updater';
	import { relaunch } from '@tauri-apps/plugin-process';
	import * as m from '$paraglide/messages.js';

	type State = 'idle' | 'available' | 'downloading' | 'done';

	let status = $state<State>('idle');
	let updateInfo = $state<Update | null>(null);
	let progress = $state(0);
	let dismissed = $state(false);

	onMount(async () => {
		if (!import.meta.env.PROD) return;
		try {
			const update = await check();
			if (update) {
				updateInfo = update;
				status = 'available';
			}
		} catch (e) {
			console.error('Failed to check for updates', e);
			// ignore update check failures silently
		}
	});

	async function install() {
		if (!updateInfo) return;
		status = 'downloading';
		let downloaded = 0;
		let total = 0;
		try {
			await updateInfo.downloadAndInstall((event) => {
				if (event.event === 'Started') {
					total = event.data.contentLength ?? 0;
				} else if (event.event === 'Progress') {
					downloaded += event.data.chunkLength;
					progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
				} else if (event.event === 'Finished') {
					status = 'done';
				}
			});
			await relaunch();
		} catch {
			status = 'available';
		}
	}
</script>

{#if !dismissed && status !== 'idle'}
	<div
		class="fixed top-4 right-4 z-50 flex w-72 flex-col gap-2 rounded border bg-popover p-4 text-sm shadow-lg"
	>
		{#if status === 'available'}
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="font-medium">{m.updater_available_title()}</p>
					<p class="text-muted-foreground">v{updateInfo?.version}</p>
				</div>
				<button
					class="text-muted-foreground hover:text-foreground"
					onclick={() => (dismissed = true)}
					aria-label={m.updater_dismiss()}>✕</button
				>
			</div>
			<button
				class="rounded bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
				onclick={install}
			>
				{m.updater_action_install()}
			</button>
		{:else if status === 'downloading'}
			<p class="font-medium">{m.updater_downloading()}</p>
			<div class="h-1.5 w-full rounded-full bg-muted">
				<div class="h-1.5 rounded-full bg-primary transition-all" style="width: {progress}%"></div>
			</div>
			<p class="text-right text-muted-foreground">{progress}%</p>
		{:else if status === 'done'}
			<p class="font-medium">{m.updater_installed()}</p>
			<p class="text-muted-foreground">{m.updater_restarting()}</p>
		{/if}
	</div>
{/if}
