import { Position, type Edge, type Node } from '@xyflow/svelte';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { BaliseLayoutOptions } from './balise-layout/interfaces';

const elk = new ELK();

export async function applyElkLayout(
	nodes: Node[],
	edges: Edge[],
	options: { direction: BaliseLayoutOptions['direction'] }
) {
	if (!elk) return { nodes, edges };

	const graph = {
		id: 'root',
		layoutOptions: {
			'elk.algorithm': 'layered',
			'elk.direction': options.direction
		},
		children: nodes.map((node) => ({
			id: node.id,
			width: node.measured?.width ?? 150,
			height: node.measured?.height ?? 40
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target
		}))
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const elkGraph = await elk.layout(graph);

	const layoutedNodes = nodes.map((node) => {
		const elkNode = elkGraph.children?.find((n) => n.id === node.id);

		if (!elkNode) return node;

		console.log(elkNode);
		return {
			...node,
			postion: { x: elkNode.x, y: elkNode.y },
			sourcePosition: options.direction === 'RIGHT' ? Position.Right : Position.Bottom,
			targetPosition: options.direction === 'RIGHT' ? Position.Left : Position.Top
		};
	});

	return { nodes: layoutedNodes, edges };
}
