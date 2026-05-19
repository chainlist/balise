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

	let { open = false }: { open?: boolean } = $props();

	const navItems: { label: string; icon: typeof KeyboardIcon; component: Component }[] = [
		{ label: 'Appearance', icon: PaletteIcon, component: AppearanceSettings },
		{ label: 'Editor', icon: TypeIcon, component: EditorSettings },
		{ label: 'Shortcuts', icon: KeyboardIcon, component: ShortcutsSettings }
	];

	let activeSection = $state(navItems[0]);
	const ActiveSection = $derived(activeSection.component);
</script>

<Dialog.Root {open} onOpenChange={(v) => (uiState.isSettingsOpen = v)}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="fixed inset-0 z-50 bg-black/40 supports-backdrop-filter:backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
		/>
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[85vh] max-w-275 max-h-250 bg-background rounded-xl shadow-2xl border flex overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
		>
			<!-- Left sidebar -->
			<div class="w-48 shrink-0 border-r bg-muted/30 flex flex-col p-3 gap-1">
				<Dialog.Title class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
					Settings
				</Dialog.Title>
				{#each navItems as item (item.label)}
					<button
						onclick={() => (activeSection = item)}
						class={cn(
							'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors text-left w-full',
							activeSection.component === item.component
								? 'bg-primary/10 text-primary font-medium'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'
						)}
					>
						<item.icon size="15" />
						{item.label}
					</button>
				{/each}
			</div>

			<!-- Right content -->
			<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
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
