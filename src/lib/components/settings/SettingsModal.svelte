<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { XIcon, KeyboardIcon, PaletteIcon, TypeIcon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { cn } from '$lib/utils.js';
	import ShortcutsSettings from './ShortcutsSettings.svelte';
	import AppearanceSettings from './AppearanceSettings.svelte';
	import EditorSettings from './EditorSettings.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import type { Component } from 'svelte';
	import * as m from '$paraglide/messages.js';

	let { open = false }: { open?: boolean } = $props();

	const navItems: {
		id: string;
		label: string;
		icon: typeof KeyboardIcon;
		component: Component;
	}[] = [
		{
			id: 'appearance',
			label: m.settings_appearance_heading(),
			icon: PaletteIcon,
			component: AppearanceSettings
		},
		{
			id: 'editor',
			label: m.settings_editor_heading(),
			icon: TypeIcon,
			component: EditorSettings
		},
		{
			id: 'shortcuts',
			label: m.settings_shortcuts_heading(),
			icon: KeyboardIcon,
			component: ShortcutsSettings
		}
	];

	let activeSection = $state(navItems[0]);
	const ActiveSection = $derived(activeSection.component);
</script>

<Dialog.Root {open} onOpenChange={(v) => (uiState.isSettingsOpen = v)}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 supports-backdrop-filter:backdrop-blur-sm"
		/>
		<Dialog.Content
			class={cn(
				'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
				'h-[85vh] max-h-250 w-[90vw] max-w-275',
				'flex overflow-hidden rounded border bg-background shadow-2xl',
				'data-[state=closed]:animate-out data-[state=open]:animate-in',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
			)}
		>
			<!-- Left sidebar -->
			<div class="flex w-48 shrink-0 flex-col gap-1 rounded border-r bg-muted/30 p-3">
				<Dialog.Title
					class="mb-1 px-2 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
				>
					{m.nav_settings()}
				</Dialog.Title>
				{#each navItems as item (item.label)}
					<button
						onclick={() => (activeSection = item)}
						class={cn(
							'flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors',
							activeSection.component === item.component
								? 'bg-primary/10 font-medium text-primary'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'
						)}
					>
						<item.icon size="15" />
						{item.label}
					</button>
				{/each}
			</div>

			<!-- Right content -->
			<div class="flex min-w-0 flex-1 flex-col overflow-hidden">
				<ActiveSection />
			</div>

			<!-- Close button -->
			<Dialog.Close>
				{#snippet child({ props })}
					<Button
						variant="ghost"
						size="icon-sm"
						class="absolute top-3 right-3 text-muted-foreground"
						{...props}
					>
						<XIcon size="16" />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
