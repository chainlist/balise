import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';

export type ToggleDrawerParams = boolean;

class ToggleDrawerCommand implements Command {
	constructor(private state?: ToggleDrawerParams) {}

	async execute() {
		const { app } = useState();

		if (this.state === undefined) {
			app.listDrawerOpened = !app.listDrawerOpened;
		} else {
			app.listDrawerOpened = this.state;
		}
	}
}

export function useToggleListDrawer(state?: ToggleDrawerParams) {
	const cmd = new ToggleDrawerCommand(state);
	return useExecuteCommand(cmd);
}
