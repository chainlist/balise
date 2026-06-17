<script lang="ts" module>
	export type BadgeVariant = 'muted' | 'primary';

	const VARIANTS: Record<BadgeVariant, string> = {
		muted: 'bg-muted text-muted-foreground',
		primary: 'bg-primary/10 text-primary'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	let {
		variant = 'muted',
		class: className,
		children
	}: { variant?: BadgeVariant; class?: string; children: Snippet } = $props();
</script>

<span class={cn('shrink-0 rounded-full px-2 py-0.5 text-xs', VARIANTS[variant], className)}>
	{@render children()}
</span>
