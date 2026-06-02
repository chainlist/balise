export interface GraphSettings {
	minCooccurrence: number;
	hideIsolated: boolean;
	nodeSizeBy: 'count' | 'degree';
	chargeStrength: number;
	linkDistance: number;
	linkStrength: number;
}

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = {
	minCooccurrence: 1,
	hideIsolated: false,
	nodeSizeBy: 'degree',
	chargeStrength: -30,
	linkDistance: 35,
	linkStrength: 0.3
};
