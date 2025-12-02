<script lang="ts">
	import { Handle, useInternalNode, type NodeProps } from '@xyflow/svelte';
	import { onMount } from 'svelte';

	let { id, data, sourcePosition, targetPosition, selected }: NodeProps = $props();

	const color = $derived((data?.color as string) ?? '');
	const internals = useInternalNode(id);

	onMount(() => {
		console.log(id, selected);
	});
</script>

<Handle type="target" position={targetPosition!} />
<Handle type="source" position={sourcePosition!} />
<div
	class="grid h-full place-content-center rounded-md border-4 bg-white"
	class:ring-2={selected}
	class:ring-blue-500={selected}
	style:border-color={color}
>
	{data?.label}
</div>
