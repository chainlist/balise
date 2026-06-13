<script lang="ts" generics="T extends string">
	import type { Component } from 'svelte';
	import type { IconProps } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		options,
		value,
		onValueChange
	}: {
		options: { value: T; label: () => string; icon?: Component<IconProps> }[];
		value: T;
		onValueChange: (value: T) => void;
	} = $props();
</script>

<div class="flex w-fit gap-1 rounded-lg bg-surface-container-highest p-1">
	{#each options as option (option.value)}
		<button
			onclick={() => onValueChange(option.value)}
			class={cn(
				'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
				value === option.value
					? 'bg-popover text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground'
			)}
		>
			{#if option.icon}
				<option.icon size="14" />
			{/if}
			{option.label()}
		</button>
	{/each}
</div>
