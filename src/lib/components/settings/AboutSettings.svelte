<script lang="ts">
	import { onMount } from 'svelte';
	import { getVersion } from '@tauri-apps/api/app';
	import { RefreshCwIcon, SparklesIcon, DownloadIcon, HeartIcon } from '@lucide/svelte';
	import appIcon from '$lib/assets/app-icon.png';
	import { updaterService } from '$lib/services/platform/updater.svelte';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import { checkForNews } from '$lib/utils/init-app';
	import * as m from '$paraglide/messages.js';
	import SettingsSection from './SettingsSection.svelte';

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

<SettingsSection
	title={m.settings_about_heading()}
	description={m.settings_about_description()}
	bodyClass="space-y-6"
>
	<!-- Hero + actions -->
	<div class="rounded-xl border bg-card p-4">
		<div class="flex items-center justify-between gap-4">
			<!-- App identity -->
			<div class="flex items-center justify-center gap-3">
				<img src={appIcon} alt="Balise" class="size-14 rounded-2xl shadow-sm" />
				<div class="space-y-1">
					<p class="text-lg leading-none font-semibold">Balise</p>
					{#if version}
						<span
							class="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
						>
							{m.settings_about_version()}
							{version}
						</span>
					{/if}
				</div>
			</div>

			<!-- Updates + What's new -->
			<div class="flex flex-col items-end gap-2">
				{#if updaterService.status === 'idle' || updaterService.status === 'up_to_date' || updaterService.status === 'error' || updaterService.status === 'checking'}
					<button
						onclick={() => updaterService.checkManually()}
						disabled={updaterService.status === 'checking'}
						class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-70"
					>
						<RefreshCwIcon
							class="size-4 {updaterService.status === 'checking' ? 'animate-spin' : ''}"
						/>
						{m.settings_about_check_updates()}
					</button>
				{:else if updaterService.status === 'available'}
					<p class="text-right text-sm">
						{m.updater_available_title()} - v{updaterService.updateInfo?.version}
					</p>
					<button
						onclick={() => updaterService.install()}
						class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						<DownloadIcon class="size-4" />
						{m.updater_action_install()}
					</button>
				{:else if updaterService.status === 'downloading'}
					<p class="text-sm font-medium">{m.updater_downloading()}</p>
					<div class="h-1.5 w-40 rounded-full bg-muted">
						<div
							class="h-1.5 rounded-full bg-primary transition-all"
							style="width: {updaterService.progress}%"
						></div>
					</div>
					<p class="text-xs text-muted-foreground">{updaterService.progress}%</p>
				{:else if updaterService.status === 'done'}
					<p class="text-sm font-medium">{m.updater_installed()}</p>
					<p class="text-xs text-muted-foreground">{m.updater_restarting()}</p>
				{/if}

				<button
					onclick={async () => {
						uiState.modal.setLastSeenVersion('');
						await checkForNews();
					}}
					class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
				>
					<SparklesIcon class="size-4" />
					{m.settings_about_read_news()}
				</button>
			</div>
		</div>
	</div>

	<!-- Built with -->
	<div class="rounded-xl border bg-card p-4">
		<div class="flex items-center gap-2">
			<HeartIcon class="size-4 text-muted-foreground" />
			<p class="text-sm font-medium">{m.settings_about_thanks_heading()}</p>
		</div>
		<div class="mt-3 grid gap-2 sm:grid-cols-2">
			{#each DEPS as dep (dep.name)}
				<div class="rounded-lg bg-muted/60 px-3 py-2">
					<p class="text-sm leading-tight font-medium">{dep.name}</p>
					<p class="mt-0.5 text-xs text-muted-foreground">{dep.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</SettingsSection>
