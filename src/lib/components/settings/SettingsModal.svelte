<script lang="ts">
	import { Dialog } from 'bits-ui';
	import {
		XIcon,
		KeyboardIcon,
		PaletteIcon,
		TypeIcon,
		InfoIcon,
		WandSparklesIcon,
		SparklesIcon,
		SlidersHorizontalIcon,
		RefreshCwIcon,
		LayoutListIcon,
		TagsIcon,
		NotebookIcon
	} from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { cn } from '$lib/utils.js';
	import ShortcutsSettings from './ShortcutsSettings.svelte';
	import AppearanceSettings from './AppearanceSettings.svelte';
	import EditorSettings from './EditorSettings.svelte';
	import JournalSettings from './JournalSettings.svelte';
	import AboutSettings from './AboutSettings.svelte';
	import MagicTagsSettings from './MagicTagsSettings.svelte';
	import TagsSettings from './TagsSettings.svelte';
	import GeneralSettings from './GeneralSettings.svelte';
	import DesksSettings from './DesksSettings.svelte';
	import SyncSettings from './SyncSettings.svelte';
	import SyncPairedDevices from './SyncPairedDevices.svelte';
	import SyncSharingSettings from './SyncSharingSettings.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { uiState } from '$lib/core/services/ui-state.svelte';
	import type { Component } from 'svelte';
	import * as m from '$paraglide/messages.js';

	function runWizard() {
		localStorage.removeItem('balise_onboarding_done');
		uiState.modal.isSettingsOpen = false;
		uiState.modal.isWizardOpen = true;
	}

	let { open = false }: { open?: boolean } = $props();

	type NavView = { id: string; label: string; component: Component };
	type NavItem = {
		id: string;
		label: string;
		icon: typeof KeyboardIcon;
		component?: Component;
		children?: NavView[];
		comingSoon?: boolean;
	};
	type NavGroup = { id: string; title: string; items: NavItem[] };

	const navGroups: NavGroup[] = [
		{
			id: 'settings',
			title: m.nav_settings(),
			items: [
				{
					id: 'general',
					label: m.settings_general_heading(),
					icon: SlidersHorizontalIcon,
					component: GeneralSettings
				},
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
					id: 'journal',
					label: m.settings_journal_heading(),
					icon: NotebookIcon,
					component: JournalSettings
				},
				{
					id: 'magic-tags',
					label: m.settings_magic_tags_heading(),
					icon: SparklesIcon,
					component: MagicTagsSettings
				},
				{
					id: 'shortcuts',
					label: m.settings_shortcuts_heading(),
					icon: KeyboardIcon,
					component: ShortcutsSettings
				},
				{
					id: 'sync',
					label: m.settings_sync_heading(),
					icon: RefreshCwIcon,
					component: SyncSettings,
					// Sync isn't ready to ship: greyed out in production builds, but kept
					// reachable in local dev (`pnpm dev`) for continued work.
					comingSoon: import.meta.env.PROD,
					children: [
						{
							id: 'sync-paired',
							label: m.settings_sync_nav_paired(),
							component: SyncPairedDevices
						},
						{
							id: 'sync-sharing',
							label: m.settings_sync_nav_sharing(),
							component: SyncSharingSettings
						}
					]
				},
				{
					id: 'about',
					label: m.settings_about_heading(),
					icon: InfoIcon,
					component: AboutSettings
				}
			]
		},
		{
			id: 'organization',
			title: m.settings_group_organization(),
			items: [
				{
					id: 'desks',
					label: m.settings_desks_heading(),
					icon: LayoutListIcon,
					component: DesksSettings
				},
				{
					id: 'tags',
					label: m.settings_tags_heading(),
					icon: TagsIcon,
					component: TagsSettings
				}
			]
		}
	];

	let activeView = $state<NavView>(navGroups[0].items[0] as NavView);
	const ActiveSection = $derived(activeView.component);

	function selectItem(item: NavItem): void {
		if (item.component) {
			activeView = { id: item.id, label: item.label, component: item.component };
		} else if (item.children?.length) {
			activeView = item.children[0];
		}
	}

	/* An item is active when its own view is showing. A parent with its own
	   component (Sync) highlights when selected; its children highlight in the
	   sub-list below. */
	function isItemActive(item: NavItem): boolean {
		return activeView.id === item.id;
	}

	const ACTIVE_CLASS = 'bg-sidebar-accent font-medium text-on-surface';
	const INACTIVE_CLASS = 'text-muted-foreground hover:bg-muted hover:text-foreground';
	const DISABLED_CLASS = 'cursor-not-allowed text-muted-foreground/50';
	const GROUP_TITLE_CLASS =
		'px-2 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground/60 uppercase';
</script>

<Dialog.Root {open} onOpenChange={(v) => (uiState.modal.isSettingsOpen = v)}>
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
				{#each navGroups as group, groupIndex (group.id)}
					{#if groupIndex === 0}
						<Dialog.Title class={cn(GROUP_TITLE_CLASS, 'mb-1')}>{group.title}</Dialog.Title>
					{:else}
						<h3 class={cn(GROUP_TITLE_CLASS, 'mt-4 mb-1')}>{group.title}</h3>
					{/if}
					{#each group.items as item (item.id)}
						<button
							onclick={() => selectItem(item)}
							disabled={item.comingSoon}
							class={cn(
								'flex w-full min-w-0 items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors',
								item.comingSoon
									? DISABLED_CLASS
									: isItemActive(item)
										? ACTIVE_CLASS
										: INACTIVE_CLASS
							)}
						>
							<item.icon size="15" class="shrink-0" />
							<span class="truncate">{item.label}</span>
							{#if item.comingSoon}
								<Badge class="ml-auto">{m.settings_sync_soon()}</Badge>
							{/if}
						</button>
						{#if item.children && !item.comingSoon}
							<div class="my-0.5 ml-[1.1875rem] flex flex-col gap-1 border-l pl-2">
								{#each item.children as child (child.id)}
									<button
										onclick={() => (activeView = child)}
										class={cn(
											'flex w-full min-w-0 items-center rounded px-2 py-1 text-left text-[13px] transition-colors',
											activeView.id === child.id ? ACTIVE_CLASS : INACTIVE_CLASS
										)}
									>
										<span class="truncate">{child.label}</span>
									</button>
								{/each}
							</div>
						{/if}
					{/each}
				{/each}
				<div class="flex-1"></div>
				<button
					onclick={runWizard}
					class="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<WandSparklesIcon size="15" />
					{m.wizard_run_again()}
				</button>
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
