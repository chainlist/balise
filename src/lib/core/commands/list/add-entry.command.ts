import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import type { Entry, NewEntry } from '../../entry/model';
import { useExecuteCommand } from '../manager.svelte';
import { v4 as uuid } from 'uuid';
import { useRefresh } from './refresh.command';

export interface AddEntryCommandParams {
	entry: NewEntry;
}

class AddEntryCommand implements Command {
	newEntry?: Entry;

	constructor(private params: AddEntryCommandParams) {}

	async execute() {
		const { entry } = this.params;

		// Handle redo
		if (!this.newEntry) {
			this.newEntry = {
				...entry,
				id: uuid(),
				createdAt: new Date(),
				updatedAt: new Date()
			} satisfies Entry;
		}

		const { app } = useState();

		app.entries = [...app.entries, this.newEntry];

		await useRefresh();

		setTimeout(() => {
			app.flowStore?.addSelectedNodes([this.newEntry.id]);
		});

		return this.newEntry!;
	}

	async undo() {
		const { app } = useState();

		if (!this.newEntry) return;

		app.entries = app.entries.filter((entry) => entry.id !== this.newEntry!.id);
		useRefresh();
	}
}

export function useAddEntry(params: AddEntryCommandParams) {
	const command = new AddEntryCommand(params);
	return useExecuteCommand(command);
}
