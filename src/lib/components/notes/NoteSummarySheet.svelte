<script lang="ts">
	import * as Sheet from '$lib/components/shadcn/sheet/index.js';
	import * as m from '$paraglide/messages.js';
	import type { OutlineItem } from '$lib/utils/cm';

	let {
		open = $bindable(false),
		outline,
		onNavigate
	}: {
		open?: boolean;
		outline: OutlineItem[];
		onNavigate: (pos: number) => void;
	} = $props();

	// Indent relative to the shallowest heading present, so a note that starts at
	// `##` still aligns to the left edge. depth drives the guide-line columns.
	const minLevel = $derived(outline.length ? Math.min(...outline.map((i) => i.level)) : 1);
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="frost-surface bg-transparent">
		<Sheet.Header class="border-b border-border">
			<Sheet.Title>{m.editor_summary()}</Sheet.Title>
		</Sheet.Header>

		{#if outline.length}
			<div class="flex min-h-0 flex-1 flex-col overflow-y-auto py-2 scrollbar-thin">
				{#each outline as item (item.from)}
					{@const depth = item.level - minLevel}
					<button
						type="button"
						class="flex min-h-7 items-stretch pr-4 text-left transition-colors hover:bg-muted"
						onclick={() => onNavigate(item.from)}
					>
						{#each Array.from({ length: depth }) as _, i (i)}
							<span class="ml-2 w-3 shrink-0 border-l border-border"></span>
						{/each}
						<span
							class="flex-1 truncate py-1 pl-2 text-sm"
							class:font-medium={depth === 0}
							class:text-muted-foreground={depth > 0}
						>
							{item.text}
						</span>
					</button>
				{/each}
			</div>
		{:else}
			<p class="px-6 py-4 text-sm text-muted-foreground">{m.editor_summary_empty()}</p>
		{/if}
	</Sheet.Content>
</Sheet.Root>
