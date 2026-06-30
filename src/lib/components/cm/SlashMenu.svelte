<script lang="ts" module>
	export type { SlashAction } from '$lib/utils/cm/slashActions';

	export interface SlashMenuAnchor {
		left: number;
		right: number;
		top: number;
		bottom: number;
	}

	export interface SlashMenuControls {
		moveUp(): void;
		moveDown(): void;
		/** Switch to the previous/next tab. Returns false when a query is active
		 *  (browsing is disabled while searching) so the key falls through to the editor. */
		prevTab(): boolean;
		nextTab(): boolean;
		confirm(): void;
		hasResults(): boolean;
		updateQuery(q: string): void;
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import * as Popover from '$lib/components/shadcn/popover';
	import {
		SLASH_ACTIONS,
		SLASH_CATEGORIES,
		type SlashAction,
		type SlashCategory
	} from '$lib/utils/cm/slashActions';

	let {
		query = '',
		anchor,
		onSelect,
		onDismiss,
		controls
	}: {
		query: string;
		anchor: SlashMenuAnchor;
		onSelect: (action: SlashAction) => void;
		onDismiss: () => void;
		controls: SlashMenuControls;
	} = $props();

	const ACTIONS = SLASH_ACTIONS;

	// Virtual anchor at the slash character so the popover can flip/shift to stay in the viewport
	const customAnchor = {
		getBoundingClientRect: () =>
			new DOMRect(anchor.left, anchor.top, anchor.right - anchor.left, anchor.bottom - anchor.top)
	};

	let internalQuery = $state(untrack(() => query));
	let selectedCategory = $state<SlashCategory>(SLASH_CATEGORIES[0].id);
	let selectedIndex = $state(0);
	let itemEls: HTMLElement[] = [];

	// While the user is typing a query the tabs are ignored and we search every action.
	let searching = $derived(internalQuery !== '');

	// Keep the keyboard-selected item visible inside the scrolling menu
	$effect(() => {
		itemEls[selectedIndex]?.scrollIntoView({ block: 'nearest' });
	});

	let filtered = $derived(
		searching
			? ACTIONS.filter(
					(a) =>
						a.label.toLowerCase().includes(internalQuery.toLowerCase()) ||
						a.keywords.some((k) => k.startsWith(internalQuery.toLowerCase()))
				)
			: ACTIONS.filter((a) => a.category === selectedCategory)
	);

	function selectCategory(id: SlashCategory) {
		selectedCategory = id;
		selectedIndex = 0;
	}

	function stepCategory(delta: number) {
		const i = SLASH_CATEGORIES.findIndex((c) => c.id === selectedCategory);
		const next = (i + delta + SLASH_CATEGORIES.length) % SLASH_CATEGORIES.length;
		selectCategory(SLASH_CATEGORIES[next].id);
	}

	$effect(() => {
		controls.moveUp = () => {
			selectedIndex = Math.max(0, selectedIndex - 1);
		};
		controls.moveDown = () => {
			selectedIndex = Math.min(filtered.length - 1, selectedIndex + 1);
		};
		controls.prevTab = () => {
			if (searching) return false;
			stepCategory(-1);
			return true;
		};
		controls.nextTab = () => {
			if (searching) return false;
			stepCategory(1);
			return true;
		};
		controls.confirm = () => {
			const action = filtered[selectedIndex];
			if (action) onSelect(action);
		};
		controls.hasResults = () => filtered.length > 0;
		controls.updateQuery = (q: string) => {
			internalQuery = q;
			selectedIndex = 0;
		};
	});
</script>

<Popover.Root
	open={filtered.length > 0}
	onOpenChange={(open) => {
		if (!open) onDismiss();
	}}
>
	<Popover.Content
		{customAnchor}
		side="bottom"
		align="start"
		sideOffset={6}
		collisionPadding={8}
		trapFocus={false}
		escapeKeydownBehavior="ignore"
		onOpenAutoFocus={(e) => e.preventDefault()}
		onCloseAutoFocus={(e) => e.preventDefault()}
		role="menu"
		class="flex max-h-[min(24rem,var(--bits-floating-available-height))] w-auto min-w-48 flex-col overflow-hidden frost-surface! p-0"
	>
		{#if !searching}
			<div
				role="tablist"
				class="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border/50 p-1 scrollbar-thin"
			>
				{#each SLASH_CATEGORIES as category (category.id)}
					<button
						role="tab"
						aria-selected={category.id === selectedCategory}
						class="shrink-0 cursor-default rounded px-2 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground"
						class:bg-accent={category.id === selectedCategory}
						class:text-accent-foreground={category.id === selectedCategory}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => selectCategory(category.id)}
					>
						{category.label}
					</button>
				{/each}
			</div>
		{/if}
		<div class="min-h-0 flex-1 overflow-y-auto p-1.5 scrollbar-thin">
			{#each filtered as action, i (action.id)}
				<button
					bind:this={itemEls[i]}
					role="menuitem"
					class="relative flex w-full cursor-default items-center gap-2.5 rounded px-3 py-2 text-left text-sm font-medium outline-none select-none hover:bg-accent hover:text-accent-foreground"
					class:bg-accent={i === selectedIndex}
					class:text-accent-foreground={i === selectedIndex}
					onmouseenter={() => {
						selectedIndex = i;
					}}
					onclick={() => onSelect(action)}
				>
					<span
						class="flex size-7 shrink-0 items-center justify-center rounded border bg-muted font-mono text-xs font-semibold"
					>
						{action.icon}
					</span>
					<span class="flex flex-col leading-tight">
						<span class="font-medium">{action.label}</span>
						<span class="text-xs text-muted-foreground">{action.description}</span>
					</span>
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
