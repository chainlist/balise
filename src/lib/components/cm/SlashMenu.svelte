<script lang="ts" module>
	export interface SlashAction {
		id: string;
		label: string;
		description: string;
		insert: string;
		keywords: string[];
		icon: string;
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
	import * as m from '$paraglide/messages.js';

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

	const ACTIONS: SlashAction[] = [
		{
			id: 'h1',
			label: m.slash_h1_label(),
			description: m.slash_h1_desc(),
			insert: '# ',
			keywords: ['heading', 'title', 'h1'],
			icon: 'H1'
		},
		{
			id: 'h2',
			label: m.slash_h2_label(),
			description: m.slash_h2_desc(),
			insert: '## ',
			keywords: ['heading', 'title', 'h2'],
			icon: 'H2'
		},
		{
			id: 'h3',
			label: m.slash_h3_label(),
			description: m.slash_h3_desc(),
			insert: '### ',
			keywords: ['heading', 'title', 'h3'],
			icon: 'H3'
		},
		{
			id: 'bullet',
			label: m.slash_bullet_label(),
			description: m.slash_bullet_desc(),
			insert: '- ',
			keywords: ['bullet', 'list', 'ul'],
			icon: '•'
		},
		{
			id: 'numbered',
			label: m.slash_numbered_label(),
			description: m.slash_numbered_desc(),
			insert: '1. ',
			keywords: ['numbered', 'ordered', 'ol'],
			icon: '1.'
		},
		{
			id: 'checklist',
			label: m.slash_checklist_label(),
			description: m.slash_checklist_desc(),
			insert: '- [ ] ',
			keywords: ['checklist', 'checkbox', 'check'],
			icon: '☐'
		},
		{
			id: 'todo',
			label: m.slash_todo_label(),
			description: m.slash_todo_desc(),
			insert: '#todo ',
			keywords: ['todo', 'task'],
			icon: '○'
		},
		{
			id: 'inprogress',
			label: m.slash_inprogress_label(),
			description: m.slash_inprogress_desc(),
			insert: '#inprogress ',
			keywords: ['inprogress', 'progress', 'wip'],
			icon: '◑'
		},
		{
			id: 'done',
			label: m.slash_done_label(),
			description: m.slash_done_desc(),
			insert: '#done ',
			keywords: ['done', 'complete'],
			icon: '✓'
		},
		{
			id: 'quote',
			label: m.slash_quote_label(),
			description: m.slash_quote_desc(),
			insert: '> ',
			keywords: ['quote', 'blockquote'],
			icon: '"'
		},
		{
			id: 'code',
			label: m.slash_code_label(),
			description: m.slash_code_desc(),
			insert: '```\n',
			keywords: ['code', 'block', 'fence'],
			icon: '</>'
		},
		{
			id: 'divider',
			label: m.slash_divider_label(),
			description: m.slash_divider_desc(),
			insert: '---\n',
			keywords: ['divider', 'separator', 'hr'],
			icon: '—'
		}
	];

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
