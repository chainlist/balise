import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';
import { useRefresh } from './refresh.command';

export interface CollapseEntryCommandParams {
	entryId: string;
	collapsed?: boolean;
}

class CollapseEntryCommand implements Command {
	constructor(private params: CollapseEntryCommandParams) {}

	async execute() {
		const { entryId, collapsed } = this.params;
		const { app } = useState();

		const entry = app.entries.find((e) => e.id === entryId);

		if (!entry) return;

		if (collapsed === undefined) {
			entry.collapsed = !entry.collapsed;
		} else {
			entry.collapsed = collapsed;
		}

		return useRefresh();
	}
}

export function useCollapsed(params: CollapseEntryCommandParams) {
	const cmd = new CollapseEntryCommand(params);
	return useExecuteCommand(cmd);
}
