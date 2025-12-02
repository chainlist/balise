import { type FitViewOptions } from '@xyflow/svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';
import { useState } from '$lib/states/index.svelte';

class FitViewCommand implements Command {
	constructor(private params?: FitViewOptions) {}

	execute() {
		const { app } = useState();
		setTimeout(() => {
			app.flowInstance?.fitView(this.params);
		});
	}
}

export function useFitView(params?: FitViewOptions) {
	const command = new FitViewCommand(params);
	return useExecuteCommand(command);
}
