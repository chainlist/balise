import { Position, type Edge, type Node } from '@xyflow/svelte';
import dagre from '@dagrejs/dagre';
import type { MindmapDirection } from '$lib/states/settings.svelte';
import type { BaliseLayoutOptions } from './balise-layout/interfaces';

function getDirection(direction: MindmapDirection = 'DOWN') {
	switch (direction) {
		case 'UP':
			return 'BT';
		case 'DOWN':
			return 'TB';
		case 'LEFT':
			return 'RL';
		case 'RIGHT':
			return 'LR';
	}
}

export function applyDagre(
	nodes: Node[],
	edges: Edge[],
	options: { direction?: MindmapDirection } = { direction: 'DOWN' }
) {
	const direction = getDirection(options.direction);

	const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

	g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

	nodes.forEach((node) => {
		g.setNode(node.id, node);
	});

	edges.forEach((edge) => {
		g.setEdge(edge.source, edge.target);
	});

	dagre.layout(g, { disableOptimalOrderHeuristic: true });

	return {
		nodes: nodes.map((node) => {
			const nodeWithPosition = g.node(node.id);
			return {
				...node,
				position: {
					x: nodeWithPosition.x - (node.width ?? 0) / 2,
					y: nodeWithPosition.y - (node.height ?? 0) / 2
				},
				sourcePosition: getPosition(options.direction!, 'source'),
				targetPosition: getPosition(options.direction!, 'target')
			};
		}),
		edges: edges.map((edge) => {
			return {
				...edge
			};
		})
	};
}

function getPosition(direction: BaliseLayoutOptions['direction'], type: 'source' | 'target') {
	switch (direction) {
		case 'UP':
			return type === 'source' ? Position.Top : Position.Bottom;
		case 'DOWN':
			return type === 'source' ? Position.Bottom : Position.Top;
		case 'LEFT':
			return type === 'source' ? Position.Left : Position.Right;
		case 'RIGHT':
			return type === 'source' ? Position.Right : Position.Left;
		default:
			return type === 'source' ? Position.Bottom : Position.Top;
	}
}
