<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		title: string;
		description?: string;
		/** Extra classes for the row container. */
		class?: string;
		/** The control(s) rendered on the trailing side of the row. */
		children: Snippet;
	}

	let { title, description, class: className, children }: Props = $props();
</script>

<div class={cn('flex items-center justify-between gap-4', className)}>
	<div class="space-y-0.5">
		<p class="text-sm font-medium">{title}</p>
		{#if description}
			<p class="text-xs text-muted-foreground">{description}</p>
		{/if}
	</div>
	{@render children()}
</div>
