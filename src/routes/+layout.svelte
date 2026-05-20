<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { tinykeys } from 'tinykeys';
	import { initApp } from '$lib/utils/init-app';
	import { initTheme } from '$lib/services/theme.svelte';
	import { initEditorSettings } from '$lib/services/editor.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { buildTinykeysMap } from '$lib/services/shortcuts.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import Sidebar from '$lib/components/sidebar/Sidebar.svelte';
	import SidebarProvider from '$lib/components/shadcn/sidebar/sidebar-provider.svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	let { children } = $props();

	let error = $state<string | null>(null);
	let ready = $derived(uiState.ready);

	onMount(async () => {
		initTheme();
		initEditorSettings();
		const { error: initError } = await initApp();
		error = initError;
	});

	$effect(() => {
		return tinykeys(
			window,
			buildTinykeysMap(
				APP_SHORTCUTS,
				() => !uiState.isSettingsOpen,
				() => !uiState.isCapturingShortcut
			)
		);
	});
</script>

<SidebarProvider>
	<!-- <svelte:head><link rel="icon" href={favicon} /></svelte:head> -->
	{#if error}
		<div class="error">
			<h1>Error</h1>
			<p>{error}</p>
		</div>
	{:else if !ready}
		<div class="flex h-screen w-screen items-center justify-center gap-4 absolute top-0 left-0" out:fade={{ duration: 250}}>
			<span>Loading...</span>
			<p class="animate-spin text-sm text-muted-foreground"><LoaderCircle /></p>
		</div>
	{:else}
		<div class="grid h-screen w-full grid-cols-[minmax(0,250px)_1fr]" in:fade={{ duration: 250 }}>
			<Sidebar />
			<div class="overflow-hidden">
				{@render children()}
			</div>
		</div>
	{/if}
</SidebarProvider>
