<script lang="ts">
	let {
		checked,
		onToggle
	}: {
		checked: boolean;
		onToggle: () => void;
	} = $props();

	const todoColor = 'oklch(0.65 0.18 240)';
	const doneColor = 'oklch(0.65 0.18 145)';

	let border = $derived(
		`color-mix(in oklch, ${checked ? doneColor : todoColor} 40%, transparent)`
	);
	let bg = $derived(checked ? border : 'transparent');
</script>

<button
	onclick={onToggle}
	aria-label={checked ? 'Mark as incomplete' : 'Mark as complete'}
	class="mr-2 inline-flex size-4 items-center justify-center rounded border-2 transition-colors"
	style="border-color: {border}; background: {bg};"
>
	<svg
		class="size-2.5 text-white transition-opacity"
		class:opacity-0={!checked}
		viewBox="0 0 10 10"
		fill="none"
	>
		<path
			d="M1.5 5L4 7.5L8.5 2.5"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</button>
