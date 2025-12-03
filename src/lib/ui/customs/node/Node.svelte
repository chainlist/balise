<script lang="ts">
	import { useState } from '$lib/states/index.svelte';
	import { Handle, type NodeProps } from '@xyflow/svelte';
	import { onMount } from 'svelte';

	let { id, data, sourcePosition, targetPosition, selected }: NodeProps = $props();

	const { app, settings } = useState();
	const color = $derived((data?.color as string) ?? '');
	const turnedOffOpacity = $derived(!app.focusedEntryId || data.focused);
	const opacity = $derived(
		!turnedOffOpacity ? settings.ui.colorSchemes[settings.ui.colorScheme].unfocusedOpacity : 1
	);

	onMount(() => {
		console.log(id, selected);
	});
</script>

<Handle type="target" position={targetPosition!} />
<Handle type="source" position={sourcePosition!} />
<div
	class="grid h-full place-content-center rounded-md border-4 bg-white transition-all duration-[{settings
		.ui.animationDuration}]"
	class:ring-2={selected}
	class:ring-blue-500={selected}
	style:border-color={color}
	style:opacity
>
	{data?.label}
</div>
