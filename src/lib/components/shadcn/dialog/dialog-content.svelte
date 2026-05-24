<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import type { ComponentProps } from "svelte";
	import DialogOverlay from "./dialog-overlay.svelte";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & { children: Snippet } = $props();
</script>

<DialogPrimitive.Portal>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		class={cn(
			"bg-popover text-popover-foreground fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border shadow-lg",
			"data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
			"data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
			className
		)}
		{...restProps}
	>
		{@render children()}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
