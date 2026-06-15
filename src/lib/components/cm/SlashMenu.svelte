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
		confirm(): void;
		hasResults(): boolean;
		updateQuery(q: string): void;
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import * as Popover from '$lib/components/shadcn/popover';
	import { SLASH_ACTIONS, type SlashAction } from '$lib/utils/cm/slashActions';

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
	let selectedIndex = $state(0);
	let itemEls: HTMLElement[] = [];

	// Keep the keyboard-selected item visible inside the scrolling menu
	$effect(() => {
		itemEls[selectedIndex]?.scrollIntoView({ block: 'nearest' });
	});

	let filtered = $derived(
		internalQuery === ''
			? ACTIONS
			: ACTIONS.filter(
					(a) =>
						a.label.toLowerCase().includes(internalQuery.toLowerCase()) ||
						a.keywords.some((k) => k.startsWith(internalQuery.toLowerCase()))
				)
	);

	$effect(() => {
		controls.moveUp = () => {
			selectedIndex = Math.max(0, selectedIndex - 1);
		};
		controls.moveDown = () => {
			selectedIndex = Math.min(filtered.length - 1, selectedIndex + 1);
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
		class="max-h-[min(24rem,var(--bits-floating-available-height))] w-auto min-w-48 overflow-y-auto scrollbar-thin frost-surface! p-1.5"
	>
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
	</Popover.Content>
</Popover.Root>
