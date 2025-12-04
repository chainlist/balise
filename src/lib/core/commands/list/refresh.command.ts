import type { Entry } from '$lib/core/entry/model';
import { useState } from '$lib/states/index.svelte';
import { type Edge, type FitViewOptions, type Node } from '@xyflow/svelte';
import { useExecuteCommand } from '../manager.svelte';
import { useFitView } from './fit-view.command';
import { applyElkLayout } from '$lib/core/layouts/elk';
import type { AppState } from '$lib/states/app.svelte';
import type { MindmapLayout, MindmapSettings, SettingsState } from '$lib/states/settings.svelte';
import { applyDagre } from '$lib/core/layouts/dagre';
import { applyBalise } from '$lib/core/layouts/balise';

export interface RefreshCommandParams {
	fitView?: boolean;
	fitViewOptions?: FitViewOptions;
}

class RefreshCommand {
	constructor(private params: RefreshCommandParams) {}

	async execute() {
		const { app, settings } = useState();

		const { nodes, edges, focusedIds }: { nodes: Node[]; edges: Edge[] } = this._entriesToFlow(
			settings,
			app
		);
		const layouted = await this._applyLayout(settings.mindmap, nodes, edges);

		app.nodes = layouted.nodes;
		app.edges = layouted.edges;

		if (this.params.fitView) {
			await useFitView(this.params.fitViewOptions);
		}

		return { nodes: layouted.nodes, edges: layouted.edges, focusedIds };
	}

	private async _applyLayout(mindmap: MindmapSettings, nodes: Node[], edges: Edge[]) {
		switch (mindmap.layout) {
			case 'dagre':
				return applyDagre(nodes, edges, { direction: mindmap.direction });
			case 'balise':
				return applyBalise(nodes, edges, { direction: mindmap.direction });
			case 'mrtree':
				return applyElkLayout(nodes, edges, { direction: mindmap.direction });
			default:
				return { nodes, edges };
		}
	}

	private _entriesToFlow(settings: SettingsState, app: AppState) {
		const branchColors = settings.ui.colorSchemes[settings.ui.colorScheme]?.branches || [];
		let branchesCount = 0;
		const nodes: Node[] = [];
		const edges: Edge[] = [];
		const focusedIds: string[] = [];
		const rootEntries = app.entries.filter((entry) => !entry.parentId);

		const walk = (entry: Entry, params: { color?: string; focused?: boolean }) => {
			const children = app.entries.filter((e) => e.parentId === entry.id);
			const existingNode = nodes.find((n) => n.id === entry.id) || {};
			const focused = params.focused || app.focusedEntryId === entry.id;

			if (params.focused) {
				focusedIds.push(entry.id);
			}

			nodes.push({
				id: entry.id,
				position: { x: entry.x ?? 0, y: entry.y ?? 0 },
				width: entry.width ?? 150,
				height: entry.height ?? 50,
				data: {
					label: entry.content,
					color: params.color,
					root: !entry.parentId,
					focused
				},
				type: entry.parentId ? 'node' : 'root',
				...existingNode
			});

			if (entry.parentId) {
				let style = `transition: stroke-opacity 0.2s ease; stroke: ${params.color}; stroke-width: 3px;`;

				if (!(!app.focusedEntryId || focused)) {
					style += `stroke-opacity: ${settings.ui.colorSchemes[settings.ui.colorScheme]?.unfocusedOpacity};`;
				}

				edges.push({
					id: `e-${entry.parentId}-${entry.id}`,
					source: entry.parentId,
					target: entry.id,
					data: { color: params.color, focused: focused },
					style
				});
			}

			const isRoot = !entry.parentId;

			if (entry.collapsed) return;

			children.forEach((child) =>
				walk(child, {
					color: isRoot ? branchColors[branchesCount++ % branchColors.length] : params.color,
					focused: params.focused || app.focusedEntryId === child.id
				})
			);
		};

		rootEntries.forEach((entry) => {
			return walk(entry, { focused: app.focusedEntryId === entry.id });
		});

		return { nodes, edges, focusedIds };
	}
}

export function useRefresh(params: RefreshCommandParams = {}) {
	const command = new RefreshCommand(params);
	return useExecuteCommand(command);
}
