<script lang="ts">
	import { useRefresh } from '$lib/core/commands/list/refresh.command';
	import { getEdges, getNodes, setEdges, setNodes, useState } from '$lib/states/index.svelte';
	import Debug from '$lib/ui/components/Debug.svelte';
	import MenuBar from '$lib/ui/components/MenuBar/MenuBar.svelte';
	import Keybindings from '$lib/ui/components/Keybindings.svelte';
	import Node from '$lib/ui/customs/node/Node.svelte';
	import Root from '$lib/ui/customs/node/Root.svelte';
	import {
		Background,
		Panel,
		SvelteFlow,
		useStore,
		useSvelteFlow,
		type Node as NodeM
	} from '@xyflow/svelte';
	import { onMount } from 'svelte';

	const { app, settings } = useState();
	const flow = useSvelteFlow();
	const store = $derived(useStore());

	let nodeTypes = { root: Root, node: Node };

	onMount(() => {
		app.flowInstance = flow;
		useRefresh({ fitView: true });
	});

	function onnodepointerenter({ node }: { node: NodeM }) {
		app.hoveredNodeId = node.id;
	}

	function onnodepointerleave() {
		app.hoveredNodeId = undefined;
	}

	$effect(() => {
		app.flowStore = store;
	});
</script>

<SvelteFlow
	bind:nodes={getNodes, setNodes}
	bind:edges={getEdges, setEdges}
	minZoom={settings.mindmap.minZoom}
	{nodeTypes}
	{onnodepointerenter}
	{onnodepointerleave}
	elevateEdgesOnSelect={false}
	disableKeyboardA11y={true}
>
	{#if settings.mindmap.bgVariant}
		<Background variant={settings.mindmap.bgVariant} />
	{/if}

	<Panel position="top-right">
		<Debug />
	</Panel>

	<Panel position="top-left">
		<MenuBar />
	</Panel>
</SvelteFlow>

<Keybindings />
