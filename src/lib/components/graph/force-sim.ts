import {
	forceSimulation,
	forceManyBody,
	forceLink,
	forceX,
	forceY,
	forceCollide,
	type Simulation
} from 'd3-force';
import type { ForceNode, ForceLink } from './force-graph';

type Sim = Simulation<ForceNode, ForceLink>;

// Heavier pairs sit closer together; light ones drift apart.
export function linkDistanceFor(weight: number, base: number): number {
	return base + 60 / Math.sqrt(weight);
}

export function createSimulation(
	nodes: ForceNode[],
	links: ForceLink[],
	opts: {
		center: { x: number; y: number };
		repulsion: number;
		linkDistance: number;
		onTick: () => void;
	}
): Sim {
	// Deterministic seed ring around the center so the first frames look settled.
	nodes.forEach((n, i) => {
		if (n.x == null) {
			const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
			n.x = opts.center.x + Math.cos(a) * 120;
			n.y = opts.center.y + Math.sin(a) * 120;
		}
	});

	return forceSimulation<ForceNode, ForceLink>(nodes)
		.force(
			'link',
			forceLink<ForceNode, ForceLink>(links)
				.id((d) => d.id)
				.distance((d) => linkDistanceFor(d.weight, opts.linkDistance))
		)
		.force('charge', forceManyBody().strength(-opts.repulsion))
		// Gravity toward the center: forceX/forceY actually *pull* nodes back,
		// unlike forceCenter (which only recenters the centroid and lets the
		// cloud expand without bound while a node is pinned/dragged). Kept low
		// so clusters can spread; charge above does the separating.
		.force('x', forceX<ForceNode>(opts.center.x).strength(0.045))
		.force('y', forceY<ForceNode>(opts.center.y).strength(0.045))
		.force(
			'collide',
			forceCollide<ForceNode>().radius((d) => d.r + 4)
		)
		.on('tick', opts.onTick);
}

// Keep the gravity centers aligned with the canvas size, without rebuilding.
export function setSimCenter(sim: Sim | null, c: { x: number; y: number }): void {
	if (!sim) return;
	(sim.force('x') as ReturnType<typeof forceX<ForceNode>> | undefined)?.x(c.x);
	(sim.force('y') as ReturnType<typeof forceY<ForceNode>> | undefined)?.y(c.y);
	sim.alpha(0.3).restart();
}

// Apply the spread sliders live, without rebuilding (keeps node positions).
export function setSimTunables(
	sim: Sim | null,
	t: { repulsion: number; linkDistance: number }
): void {
	if (!sim) return;
	(sim.force('charge') as ReturnType<typeof forceManyBody> | undefined)?.strength(-t.repulsion);
	(sim.force('link') as ReturnType<typeof forceLink<ForceNode, ForceLink>> | undefined)?.distance(
		(d) => linkDistanceFor(d.weight, t.linkDistance)
	);
	sim.alpha(0.4).restart();
}
