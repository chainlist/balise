<script lang="ts">
	import { onMount } from 'svelte';
	import { tinykeys } from 'tinykeys';
	import { initApp } from '$lib/utils/init-app';
	import { trayService } from '$lib/services/platform/tray';
	import { uiState } from '$lib/services/app/ui-state.svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { exit } from '@tauri-apps/plugin-process';
	import CloseToTrayDialog from '$lib/components/CloseToTrayDialog.svelte';
	import { shortcutsService } from '$lib/services/platform/shortcuts.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
	import NotesPanel from '$lib/components/sidebar/NotesPanel.svelte';
	import SidebarProvider from '$lib/components/shadcn/sidebar/sidebar-provider.svelte';
	import ResizablePanel from '$lib/components/ResizablePanel.svelte';
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
	let showCloseDialog = $state(false);

	onMount(async () => {
		const [{ error: initError }] = await Promise.all([initApp(), trayService.init()]);
		error = initError;
		if (!error) {
			uiState.modal.isWizardOpen = !localStorage.getItem('balise_onboarding_done');
		}

		const win = getCurrentWindow();
		await win.onCloseRequested(async (event) => {
			event.preventDefault();
			const pref = settingsService.general.state.closeToTray;
			if (pref === null) {
				showCloseDialog = true;
			} else if (pref) {
				await win.hide();
				await trayService.show();
			} else {
				await exit(0);
			}
		});
	});

	async function handleCloseBehaviorChoice(choice: 'tray' | 'quit') {
		showCloseDialog = false;
		settingsService.general.setCloseToTray(choice === 'tray');
		if (choice === 'tray') {
			await getCurrentWindow().hide();
			await trayService.show();
		} else {
			await exit(0);
		}
	}

	$effect(() => {
		if (!ready) return;
		return tinykeys(
			window,
			shortcutsService.buildTinykeysMap(
				APP_SHORTCUTS,
				() => !uiState.modal.isSettingsOpen,
				() => !uiState.modal.isCapturingShortcut
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
			{#if !uiState.modal.isZenModeActive}
				<Sidebar />
				<ResizablePanel storageKey="balise-notes-panel-width" defaultWidth={280} minWidth={200}>
					<NotesPanel />
				</ResizablePanel>
			{/if}
			<div class="min-w-0 flex-1">
				{@render children()}
			</div>
		</div>
		<CommandPalette />
		<UpdateNotifier />
		{#if uiState.modal.isWizardOpen}
			<WizardModal />
		{/if}
		{#if uiState.modal.isNewsOpen}
			<NewsModal />
		{/if}
	{/if}
</SidebarProvider>

<CloseToTrayDialog bind:open={showCloseDialog} onchoose={handleCloseBehaviorChoice} />
