<script lang="ts">
	import { onMount } from 'svelte';
	import { getVersion } from '@tauri-apps/api/app';
	import { updaterService } from '$lib/services/updater.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { checkForNews } from '$lib/utils/init-app';
	import * as m from '$paraglide/messages.js';

	const DEPS = [
		{ name: 'Tauri', desc: 'Desktop application framework' },
		{ name: 'SvelteKit', desc: 'Web application framework' },
		{ name: 'Tailwind CSS', desc: 'Utility-first CSS framework' },
		{ name: 'CodeMirror', desc: 'Extensible code editor' },
		{ name: 'Shiki', desc: 'Syntax highlighting' },
		{ name: 'Lucide', desc: 'Icon library' },
		{ name: 'Paraglide', desc: 'Internationalization' },
		{ name: 'nanoid', desc: 'Unique ID generation' },
		{ name: 'tinykeys', desc: 'Keyboard shortcuts' },
		{ name: 'marked', desc: 'Markdown parser' }
	];

	let version = $state('');

	onMount(async () => {
		version = await getVersion();
	});
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{m.settings_about_heading()}</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">{m.settings_about_description()}</p>
	</div>

	<div class="flex-1 space-y-8 overflow-y-auto scrollbar-thin px-6 py-6">
		<!-- App info -->
		<div>
			<p class="text-sm font-semibold">Balise</p>
			<p class="mt-1 text-xs text-muted-foreground">{m.settings_about_version()} {version}</p>
		</div>

		<!-- Updates -->
		<div>
			<div class="mb-4 space-y-1.5">
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
					<p class="text-sm">
						{m.updater_available_title()} - v{updaterService.updateInfo?.version}
					</p>
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
				<p class="mt-1 text-xs text-muted-foreground">{m.updater_restarting()}</p>
			{/if}
		</div>

		<!-- What's new -->
			<div>
				<div class="mb-4 space-y-1.5">
					<p class="text-sm font-medium">{m.settings_about_news_label()}</p>
				</div>
				<button
					onclick={async () => { uiState.modal.setLastSeenVersion(''); await checkForNews(); }}
					class="rounded border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
				>
					{m.settings_about_read_news()}
				</button>
			</div>

			<!-- Thanks to -->
		<div>
			<p class="mb-3 text-sm font-medium">{m.settings_about_thanks_heading()}</p>
			<ul class="space-y-2">
				{#each DEPS as dep (dep.name)}
					<li class="flex items-baseline gap-2">
						<span class="text-sm font-medium">{dep.name}</span>
						<span class="text-xs text-muted-foreground">{dep.desc}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
