<script lang="ts">
	import { onMount } from 'svelte';
	import { getVersion } from '@tauri-apps/api/app';
	import { updaterService } from '$lib/services/updater.svelte';
	import * as m from '$paraglide/messages.js';

	let version = $state('');

	onMount(async () => {
		version = await getVersion();
	});
</script>

<div class="flex flex-col h-full">
	<div class="px-6 py-4 border-b">
		<h2 class="text-base font-semibold">{m.settings_about_heading()}</h2>
		<p class="text-sm text-muted-foreground mt-0.5">{m.settings_about_description()}</p>
	</div>

	<div class="flex-1 overflow-y-auto px-6 py-6 space-y-8">
		<!-- App info -->
		<div>
			<p class="text-sm font-semibold">Balise</p>
			<p class="text-xs text-muted-foreground mt-1">{m.settings_about_version()} {version}</p>
		</div>

		<!-- Updates -->
		<div>
			<div class="space-y-1.5 mb-4">
				<p class="text-sm font-medium">{m.settings_about_updates_label()}</p>
			</div>

			{#if updaterService.status === 'idle' || updaterService.status === 'up_to_date' || updaterService.status === 'error'}
				<button
					onclick={() => updaterService.checkManually()}
					class="rounded border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
				>
					{m.settings_about_check_updates()}
				</button>
				{#if updaterService.status === 'up_to_date'}
					<p class="mt-2 text-xs text-muted-foreground">{m.settings_about_up_to_date()}</p>
				{:else if updaterService.status === 'error'}
					<p class="mt-2 text-xs text-destructive">{m.settings_about_check_failed()}</p>
				{/if}
			{:else if updaterService.status === 'checking'}
				<p class="text-sm text-muted-foreground">{m.settings_about_checking()}</p>
			{:else if updaterService.status === 'available'}
				<div class="space-y-2">
					<p class="text-sm">{m.updater_available_title()} — v{updaterService.updateInfo?.version}</p>
					<button
						onclick={() => updaterService.install()}
						class="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
					>
						{m.updater_action_install()}
					</button>
				</div>
			{:else if updaterService.status === 'downloading'}
				<div class="space-y-2">
					<p class="text-sm font-medium">{m.updater_downloading()}</p>
					<div class="h-1.5 w-full max-w-xs rounded-full bg-muted">
						<div
							class="h-1.5 rounded-full bg-primary transition-all"
							style="width: {updaterService.progress}%"
						></div>
					</div>
					<p class="text-xs text-muted-foreground">{updaterService.progress}%</p>
				</div>
			{:else if updaterService.status === 'done'}
				<p class="text-sm font-medium">{m.updater_installed()}</p>
				<p class="text-xs text-muted-foreground mt-1">{m.updater_restarting()}</p>
			{/if}
		</div>

		<!-- Thanks to -->
		<div>
			<p class="text-sm font-medium mb-3">{m.settings_about_thanks_heading()}</p>
			<ul class="space-y-2">
				{#each [
					{ name: 'Tauri', desc: 'Desktop application framework' },
					{ name: 'SvelteKit', desc: 'Web application framework' },
					{ name: 'Tailwind CSS', desc: 'Utility-first CSS framework' },
					{ name: 'CodeMirror', desc: 'Extensible code editor' },
					{ name: 'Shiki', desc: 'Syntax highlighting' },
					{ name: 'Lucide', desc: 'Icon library' },
					{ name: 'Paraglide', desc: 'Internationalization' },
					{ name: 'nanoid', desc: 'Unique ID generation' },
					{ name: 'tinykeys', desc: 'Keyboard shortcuts' },
					{ name: 'marked', desc: 'Markdown parser' },
				] as dep (dep.name)}
					<li class="flex items-baseline gap-2">
						<span class="text-sm font-medium">{dep.name}</span>
						<span class="text-xs text-muted-foreground">{dep.desc}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
