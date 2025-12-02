import type { Entry } from '$lib/core/entry/model';
import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';

export interface RemoveEntryCommandParams {
	id: string;
}

class RemoveEntryCommand implements Command {
	entry: Entry | undefined;
	index: number | undefined;

	constructor(private params: RemoveEntryCommandParams) {}

	async execute() {
		const { app } = useState();
		this.index = app.entries.findIndex((entry) => entry.id === this.params.id);

		if (this.index === -1) return;

		this.entry = app.entries[this.index];

		if (!this.entry) return;

		app.entries = app.entries.filter((entry) => entry.id !== this.entry!.id);
	}

	undo() {
		if (this.index === -1 || !this.entry) return;

		const { app } = useState();
		app.entries.splice(this.index!, 0, this.entry);
	}
}

export function useRemoveEntry(params: RemoveEntryCommandParams) {
	const command = new RemoveEntryCommand(params);
	return useExecuteCommand(command);
}
