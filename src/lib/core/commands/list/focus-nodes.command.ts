import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';
import { useFitView } from './fit-view.command';

export interface FocusNodesCommandParams {
	ids: string[];
}

class FocusNodesCommand implements Command {
	constructor(private params: FocusNodesCommandParams) {}

	async execute() {
		const { settings } = useState();
		return useFitView({
			duration: settings.ui.animationDuration,
			nodes: this.params.ids.map((id) => ({ id }))
		});
	}
}

export function useFocusNodes(params: FocusNodesCommandParams) {
	const cmd = new FocusNodesCommand(params);
	return useExecuteCommand(cmd);
}
