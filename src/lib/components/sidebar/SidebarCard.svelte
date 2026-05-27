<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronDownIcon } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	let {
		title,
		open = false,
		onToggle,
		collapsible = true,
		fitContent = false,
		children,
		headerEnd
	}: {
		title?: string;
		open?: boolean;
		onToggle?: () => void;
		collapsible?: boolean;
		fitContent?: boolean;
		children: Snippet;
		headerEnd?: Snippet;
	} = $props();

	const grow = $derived(!fitContent && open);
</script>

<section
	class="flex flex-col rounded bg-card shadow-md transition-[flex-grow] duration-200 ease-out"
	style:flex-grow={grow ? 1 : 0}
	class:min-h-0={grow}
>
	{#if collapsible}
		<header class="flex items-center gap-1 px-3 py-2">
			<button
				type="button"
				class="flex flex-1 items-center justify-between text-left text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase transition-colors hover:text-sidebar-foreground"
				onclick={onToggle}
				aria-expanded={open}
			>
				<span>{title}</span>
				<ChevronDownIcon
					class="size-3.5 shrink-0 text-sidebar-foreground/40 transition-transform duration-200 {open
						? ''
						: '-rotate-90'}"
				/>
			</button>
			{#if headerEnd}
				{@render headerEnd()}
			{/if}
		</header>
	{/if}
	{#if !collapsible || open}
		<div
			transition:fade={{ duration: 150 }}
			class="flex flex-col overflow-hidden"
			class:min-h-0={grow}
			class:flex-1={grow}
		>
			{@render children()}
		</div>
	{/if}
</section>
