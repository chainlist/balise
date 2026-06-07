<script lang="ts" module>
	export type { SlashAction } from '$lib/utils/cm/slashActions';

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
	import { SLASH_ACTIONS, type SlashAction } from '$lib/utils/cm/slashActions';

	let {
		query = '',
		x = 0,
		y = 0,
		onSelect,
		controls
	}: {
		query: string;
		x: number;
		y: number;
		onSelect: (action: SlashAction) => void;
		controls: SlashMenuControls;
	} = $props();

	const ACTIONS = SLASH_ACTIONS;

	let internalQuery = $state(untrack(() => query));
	let selectedIndex = $state(0);

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

{#if filtered.length > 0}
	<div
		role="menu"
		class="fixed z-50 min-w-48 overflow-hidden rounded border bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
		style="left: {x}px; top: {y}px;"
	>
		{#each filtered as action, i (action.id)}
			<button
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
{/if}
