import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';
import { useFocusNodes } from './focus-nodes.command';
import { useRefresh } from './refresh.command';

export interface FocusBranchParams {
	id?: string;
}

class FocusBranchCommand implements Command {
	constructor(private params: FocusBranchParams) {}

	async execute() {
		const { app } = useState();

		app.focusedEntryId = this.params.id;
		(await useRefresh()) as { focusedIds: string[] };
	}
}

export function useFocusBranch(params: FocusBranchParams) {
	const cmd = new FocusBranchCommand(params);
	return useExecuteCommand(cmd);
}
