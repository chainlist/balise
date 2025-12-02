import type { Edge, Node } from '@xyflow/svelte';
import type { BaliseLayoutOptions } from './balise-layout/interfaces';
import { useBaliseLayout } from './balise-layout/BaliseLayout';

function getPosition(direction: BaliseLayoutOptions['direction'], type: 'source' | 'target') {
	switch (direction) {
		case 'UP':
			return type === 'source' ? 'top' : 'bottom';
		case 'DOWN':
			return type === 'source' ? 'bottom' : 'top';
		case 'LEFT':
			return type === 'source' ? 'left' : 'right';
		case 'RIGHT':
			return type === 'source' ? 'right' : 'left';
		default:
			return type === 'source' ? 'bottom' : 'top';
	}
}

export function applyBalise(
	nodes: Node[],
	edges: Edge[],
	options: Partial<BaliseLayoutOptions> = { direction: 'DOWN' }
) {
	// Find root nodes from the edges list

	// const rootNodes = nodes.filter(node => !edges.some(edge => edge.target === node.id));
	const graph = useBaliseLayout(options);

	nodes.forEach((n) => {
		graph.addNode(n.id, {
			id: n.id,
			width: n.measured?.width || n.width || 100,
			height: n.measured?.height || n.height || 50,
			position: n.position,
			fixed: !!n.data?.fixed
		});
	});

	edges.forEach((e) => {
		graph.addEdge(e.source, e.target);
	});

	const result = graph.layout();

	return {
		nodes: nodes.map((n) => {
			const node = result.find((no) => no.id === n.id)!;

			return {
				...n,
				position: { x: node.position?.x ?? 0, y: node.position?.y ?? 0 },
				sourcePosition: getPosition(options.direction!, 'source'),
				targetPosition: getPosition(options.direction!, 'target')
			};
		}),
		edges
	};
}
