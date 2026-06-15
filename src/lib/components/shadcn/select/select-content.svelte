<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		...restProps
	}: SelectPrimitive.ContentProps = $props();
</script>

<SelectPrimitive.Portal>
	<SelectPrimitive.Content
		bind:ref
		data-slot="select-content"
		{sideOffset}
		class={cn(
			'data-[state=closed]:animate-out data-[state=open]:animate-in',
			'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
			'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
			'relative z-50 max-h-(--bits-floating-available-height) min-w-(--bits-floating-anchor-width) origin-(--bits-floating-transform-origin) overflow-x-hidden overflow-y-auto p-1 frost-surface border-border!',
			className
		)}
		{...restProps}
	/>
</SelectPrimitive.Portal>
