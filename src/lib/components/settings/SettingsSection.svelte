<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		title: string;
		description?: string;
		/**
		 * Classes for the scrollable body (spacing varies per section). Pass `null`
		 * to render the children directly, for sections with a custom body such as
		 * a full-bleed table or border-separated rows.
		 */
		bodyClass?: string | null;
		/** Extra header content rendered under the title/description. */
		header?: Snippet;
		children: Snippet;
	}

	let { title, description, bodyClass = 'space-y-8', header, children }: Props = $props();
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{title}</h2>
		{#if description}
			<p class="mt-0.5 text-sm text-muted-foreground">{description}</p>
		{/if}
		{@render header?.()}
	</div>

	{#if bodyClass === null}
		{@render children()}
	{:else}
		<div class={cn('flex-1 overflow-y-auto scrollbar-thin px-6 py-6', bodyClass)}>
			{@render children()}
		</div>
	{/if}
</div>
