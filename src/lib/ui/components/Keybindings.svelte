<script lang="ts">
	import { useAddChild } from '$lib/core/commands/list/add-child.command';
	import { useAddParent } from '$lib/core/commands/list/add-parent.command';
	import { useAddSibling } from '$lib/core/commands/list/add-sibling.command';
	import { useFitView } from '$lib/core/commands/list/fit-view.command';
	import { useFocusBranch } from '$lib/core/commands/list/focus-branch.command';
	import { useToggleListDrawer } from '$lib/core/commands/list/toggle-list-drawer.command';
	import { useUpdateUISettings } from '$lib/core/commands/list/update-ui-settings.command';
	import { useRedoCommand, useUndoCommand } from '$lib/core/commands/manager.svelte';
	import { useState } from '$lib/states/index.svelte';
	import { useStore } from '@xyflow/svelte';
	import { tinykeys } from 'tinykeys';

	const { app, settings } = useState();
	const store = $derived(useStore());

	const selectedNode = $derived(
		store.selectedNodes.length === 1 ? store.selectedNodes[0] : undefined
	);

	$effect(() => {
		return tinykeys(window, {
			'Shift+Tab': (e: KeyboardEvent) => {
				e.preventDefault();

				if (!selectedNode) return;

				useAddParent({ entryId: selectedNode.id });
			},
			Tab: (e: KeyboardEvent) => {
				if (!selectedNode) return;

				useAddChild({ parentId: selectedNode.id });
			},
			Enter: (e: KeyboardEvent) => {
				e.preventDefault();

				if (!selectedNode) return;

				useAddSibling({ entryId: selectedNode.id });
			},
			f: (e: KeyboardEvent) => {
				e.preventDefault();
				if (!selectedNode && !app.hoveredNodeId) {
					return useFocusBranch({ id: undefined });
				}

				useFocusBranch({ id: selectedNode?.id || app.hoveredNodeId! });
			},
			'$mod+1': (event) => {
				event.preventDefault();
				if (!selectedNode) return;

				useFitView({ nodes: [{ id: selectedNode.id }], duration: settings.ui.animationDuration });
			},
			'$mod+2': (event) => {
				event.preventDefault();
				useToggleListDrawer();
			},
			'$mod+z': (event) => {
				event.preventDefault();
				useUndoCommand();
			},
			'$mod+y': (event) => {
				event.preventDefault();
				useRedoCommand();
			},
			F12: (e: KeyboardEvent) => {
				e.preventDefault();
				const { settings } = useState();
				useUpdateUISettings({ debugMode: !settings.ui.debugMode });
			}
		});
	});
</script>
