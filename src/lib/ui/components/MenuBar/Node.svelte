<script lang="ts">
	import * as MenuBar from '$lib/ui/components/shadcn/menubar/index.js';
	import { useStore } from '@xyflow/svelte';
	import { useAddChild } from '$lib/core/commands/list/add-child.command';
	import { useAddParent } from '$lib/core/commands/list/add-parent.command';
	import { useAddSibling } from '$lib/core/commands/list/add-sibling.command';

	const store = $derived(useStore());

	const selectedNode = $derived(
		store.selectedNodes.length === 1 ? store.selectedNodes[0] : undefined
	);

	function addParent() {
		if (!selectedNode) return;

		useAddParent({ entryId: selectedNode.id });
	}

	function addSibling() {
		if (!selectedNode) return;

		useAddSibling({ entryId: selectedNode.id });
	}

	function addChild() {
		if (!selectedNode) return;

		useAddChild({ parentId: selectedNode.id });
	}
</script>

<MenuBar.Menu>
	<MenuBar.Trigger disabled={!selectedNode}>Node</MenuBar.Trigger>
	<MenuBar.Content class="w-56" align="start">
		<MenuBar.Item onclick={addParent}>
			Add new parent <MenuBar.Shortcut>Shift Tab</MenuBar.Shortcut>
		</MenuBar.Item>
		<MenuBar.Item onclick={addSibling}
			>Add sibling <MenuBar.Shortcut>Enter</MenuBar.Shortcut></MenuBar.Item
		>
		<MenuBar.Item onclick={addChild}
			>Add child <MenuBar.Shortcut>Tab</MenuBar.Shortcut></MenuBar.Item
		>
	</MenuBar.Content>
</MenuBar.Menu>
