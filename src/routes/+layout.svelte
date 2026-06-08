<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { tinykeys } from 'tinykeys';
	import { initApp } from '$lib/utils/init-app';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { modalState } from '$lib/services/modal-state.svelte';
	import { shortcutsService } from '$lib/services/shortcuts.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
	import NotesPanel from '$lib/components/sidebar/NotesPanel.svelte';
	import SidebarProvider from '$lib/components/shadcn/sidebar/sidebar-provider.svelte';
	import * as Resizable from '$lib/components/shadcn/resizable/index.js';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import UpdateNotifier from '$lib/components/UpdateNotifier.svelte';
	import WizardModal from '$lib/components/WizardModal.svelte';
	import NewsModal from '$lib/components/NewsModal.svelte';
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
			modalState.isWizardOpen = !localStorage.getItem('balise_onboarding_done');
		}
	});

	$effect(() => {
		return tinykeys(
			window,
			shortcutsService.buildTinykeysMap(
				APP_SHORTCUTS,
				() => !modalState.isSettingsOpen,
				() => !modalState.isCapturingShortcut
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
		<div class="flex h-screen w-full" in:fade={{ duration: 250 }}>
			{#if !modalState.isZenModeActive}
				<Sidebar />
			{/if}
			<Resizable.PaneGroup direction="horizontal" autoSaveId="balise-main-layout" class="flex-1">
				{#if !modalState.isZenModeActive}
					<Resizable.Pane defaultSize={22} minSize={15} order={1}>
						<NotesPanel />
					</Resizable.Pane>
					<Resizable.Handle />
				{/if}
				<Resizable.Pane order={2}>
					{@render children()}
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
		<CommandPalette />
		<UpdateNotifier />
		{#if modalState.isWizardOpen}
			<WizardModal />
		{/if}
		{#if modalState.isNewsOpen}
			<NewsModal />
		{/if}
	{/if}
</SidebarProvider>
