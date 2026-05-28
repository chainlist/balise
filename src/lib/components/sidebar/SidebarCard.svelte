<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronDownIcon } from '@lucide/svelte';

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

	const flex = $derived(!fitContent);
	const isOpen = $derived(!collapsible || open);
</script>

<section
	class="panel"
	class:fit={fitContent}
	class:open={isOpen}
	style:flex-grow={isOpen && flex ? 1 : 0}
	style:flex-basis={isOpen && flex ? '0' : 'auto'}
	style:max-height={fitContent ? (isOpen ? '9999px' : undefined) : undefined}
>
	{#if collapsible}
		<button type="button" class="flex items-center gap-1 px-3 py-2" onclick={onToggle}>
			<div
				class="flex flex-1 items-center justify-between text-left text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase hover:text-sidebar-foreground"
				aria-expanded={open}
			>
				<span>{title}</span>
				<ChevronDownIcon
					class="size-3.5 shrink-0 text-sidebar-foreground/40 {open ? '' : '-rotate-90'}"
				/>
			</div>
			{#if headerEnd}
				{@render headerEnd()}
			{/if}
		</button>
	{/if}
	<div class="body" class:open={isOpen}>
		<div class="body-inner">
			{@render children()}
		</div>
	</div>
</section>

<style lang="postcss">
	@reference "../../../routes/layout.css";

	.panel {
		@apply flex min-h-0 flex-col overflow-hidden rounded bg-card shadow-md;
		transition:
			flex-grow 0.2s ease,
			flex-basis 0.2s ease,
			max-height 0.2s ease;
	}

	.body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.2s ease;
		overflow: hidden;
	}

	.body.open {
		grid-template-rows: 1fr;
	}

	/* flex panels: body must fill and scroll */
	.panel:not(.fit) .body {
		flex: 1 1 0;
		min-height: 0;
	}

	.body-inner {
		min-height: 0;
		overflow: hidden;
	}

	.panel:not(.fit) .body-inner {
		@apply scrollbar-none overflow-y-auto;
	}
</style>
