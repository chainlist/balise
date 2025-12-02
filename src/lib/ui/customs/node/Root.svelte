<script lang="ts">
	import { Handle, useInternalNode, type NodeProps } from '@xyflow/svelte';

	let { id, data, sourcePosition, targetPosition }: NodeProps = $props();

	const internal = useInternalNode(id);
</script>

<Handle type="target" position={targetPosition!} />
<Handle type="source" position={sourcePosition!} />

<div class="bg-white-300 grid h-full place-content-center rounded-xl border bg-white">
	{data?.label}
</div>
