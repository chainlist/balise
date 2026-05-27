<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { tinykeys } from 'tinykeys';
	import { initApp } from '$lib/utils/init-app';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { shortcutsService } from '$lib/services/shortcuts.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
	import SidebarProvider from '$lib/components/shadcn/sidebar/sidebar-provider.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import UpdateNotifier from '$lib/components/UpdateNotifier.svelte';
	import WizardModal from '$lib/components/WizardModal.svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import { fade } from 'svelte/transition';

	let { children } = $props();

	let error = $state<string | null>(null);
	let ready = $derived(uiState.ready);
	onMount(async () => {
		const { error: initError } = await initApp();
		error = initError;
		if (!error) {
			uiState.isWizardOpen = !localStorage.getItem('balise_onboarding_done');
		}
	});

	$effect(() => {
		return tinykeys(
			window,
			shortcutsService.buildTinykeysMap(
				APP_SHORTCUTS,
				() => !uiState.isSettingsOpen,
				() => !uiState.isCapturingShortcut
			)
		);
	});
</script>

<SidebarProvider>
	{#if error}
		<div class="error">
			<h1>{m.error_heading()}</h1>
			<p>{error}</p>
		</div>
	{:else if !ready}
		<div
			class="absolute top-0 left-0 flex h-screen w-screen items-center justify-center gap-4"
			out:fade={{ duration: 250 }}
		>
			<span>{m.loading()}</span>
			<p class="animate-spin text-sm text-muted-foreground"><LoaderCircle /></p>
		</div>
	{:else}
		<div class="relative flex h-screen w-full" in:fade={{ duration: 250 }}>
			<div
				class="ease absolute inset-y-0 left-0 z-10 transition-transform duration-150"
				class:zen={uiState.isZenModeActive}
			>
				<Sidebar />
			</div>
			<div
				class="ease h-full w-full overflow-hidden transition-[padding-left] duration-150"
				class:pl-75={!uiState.isZenModeActive}
			>
				{@render children()}
			</div>
		</div>
		<CommandPalette />
		<UpdateNotifier />
		{#if uiState.isWizardOpen}
			<WizardModal />
		{/if}
	{/if}
</SidebarProvider>

<style lang="postcss">
	@reference './layout.css';

	.zen {
		@apply -translate-x-full;
	}
</style>
