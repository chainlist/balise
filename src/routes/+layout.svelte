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
	import { LoaderCircle } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import { fade } from 'svelte/transition';

	let { children } = $props();

	let error = $state<string | null>(null);
	let ready = $derived(uiState.ready);

	onMount(async () => {
		const { error: initError } = await initApp();
		error = initError;
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
		<div class="grid h-screen w-full grid-cols-[minmax(0,250px)_1fr]" in:fade={{ duration: 250 }}>
			<Sidebar />
			<div class="overflow-hidden">
				{@render children()}
			</div>
		</div>
		<CommandPalette />
		<UpdateNotifier />
	{/if}
</SidebarProvider>
