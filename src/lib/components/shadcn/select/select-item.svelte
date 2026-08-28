<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { CheckIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children: childrenProp,
		...restProps
	}: SelectPrimitive.ItemProps = $props();
</script>

<SelectPrimitive.Item
	bind:ref
	data-slot="select-item"
	class={cn(
		'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
		'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
		'data-disabled:pointer-events-none data-disabled:opacity-50',
		'data-[state=checked]:font-medium',
		className
	)}
	{...restProps}
>
	{#snippet children({ selected, highlighted })}
		<span class="absolute right-2 flex size-3.5 items-center justify-center">
			{#if selected}
				<CheckIcon size={12} />
			{/if}
		</span>
		{#if childrenProp}
			{@render childrenProp({ selected, highlighted })}
		{:else}
			{restProps.label}
		{/if}
	{/snippet}
</SelectPrimitive.Item>
