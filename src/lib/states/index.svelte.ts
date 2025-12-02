import type { Edge, Node } from '@xyflow/svelte';
import { AppState } from './app.svelte';
import { SettingsState } from './settings.svelte';

const globalState = {
	app: new AppState(),
	settings: new SettingsState()
};

export function useState() {
	return globalState;
}

// Utils functions for SvelteFlow
export function getNodes() {
	return globalState.app.nodes;
}

export function setNodes(nodes: Node[]) {
	globalState.app.nodes = nodes;
}

export function getEdges() {
	return globalState.app.edges;
}

export function setEdges(edges: Edge[]) {
	globalState.app.edges = edges;
}
