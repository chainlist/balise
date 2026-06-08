<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { ChevronDownIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: SelectPrimitive.TriggerProps = $props();
</script>

<SelectPrimitive.Trigger
	bind:ref
	data-slot="select-trigger"
	class={cn(
		'flex h-[30px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2 py-1 text-sm',
		'focus:outline-none focus:ring-1 focus:ring-primary',
		'data-placeholder:text-muted-foreground',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDownIcon size={12} class="shrink-0 text-muted-foreground" />
</SelectPrimitive.Trigger>
