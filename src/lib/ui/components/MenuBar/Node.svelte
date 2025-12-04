<script lang="ts">
	import * as MenuBar from '$lib/ui/components/shadcn/menubar/index.js';
	import { useStore } from '@xyflow/svelte';
	import { useAddChild } from '$lib/core/commands/list/add-child.command';
	import { useAddParent } from '$lib/core/commands/list/add-parent.command';
	import { useAddSibling } from '$lib/core/commands/list/add-sibling.command';
	import { useFocusNodes } from '$lib/core/commands/list/focus-nodes.command';
	import { useFocusBranch } from '$lib/core/commands/list/focus-branch.command';
	import { ArrowBigUp } from '@lucide/svelte';
	import { useCollapsed } from '$lib/core/commands/list/collapse-entry.command';
	import { SubContent } from '../shadcn/dropdown-menu';

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

	function focusNode() {
		if (!selectedNode) return;

		useFocusNodes({ ids: [selectedNode.id] });
	}

	function focusBranch() {
		if (!selectedNode) return;

		useFocusBranch({ id: selectedNode.id });
	}

	function collapse() {
		if (!selectedNode) return;

		useCollapsed({ entryId: selectedNode.id });
	}
</script>

<MenuBar.Menu>
	<MenuBar.Trigger disabled={!selectedNode}>
		<span class="transition-colors duration-200" class:text-secondary={!selectedNode}> Node </span>
	</MenuBar.Trigger>
	<MenuBar.Content class="w-56" align="start">
		<MenuBar.Label>Actions</MenuBar.Label>
		<MenuBar.Sub>
			<MenuBar.SubTrigger>Focus</MenuBar.SubTrigger>
			<MenuBar.SubContent>
				<MenuBar.Item onclick={focusNode}>Node</MenuBar.Item>
				<MenuBar.Item onclick={focusBranch}>Branch</MenuBar.Item>
			</MenuBar.SubContent>
		</MenuBar.Sub>
		<MenuBar.Item onclick={collapse}>Collapse</MenuBar.Item>
		<MenuBar.Separator />
		<MenuBar.Item onclick={addParent}>
			Add new parent <MenuBar.Shortcut>Shift+Tab</MenuBar.Shortcut>
		</MenuBar.Item>
		<MenuBar.Item onclick={addSibling}>
			Add sibling
			<MenuBar.Shortcut>Enter</MenuBar.Shortcut>
		</MenuBar.Item>
		<MenuBar.Item onclick={addChild}>
			Add child
			<MenuBar.Shortcut>Tab</MenuBar.Shortcut>
		</MenuBar.Item>
	</MenuBar.Content>
</MenuBar.Menu>
