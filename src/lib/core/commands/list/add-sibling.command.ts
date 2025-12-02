import type { Entry, NewEntry } from '$lib/core/entry/model';
import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';
import { useAddEntry } from './add-entry.command';
import { useRefresh } from './refresh.command';

export interface AddSiblingCommandParams {
	entryId: string;
	entry?: Partial<NewEntry>;
}

class AddSiblingCommand implements Command {
	newEntry: Entry | undefined;

	constructor(private params: AddSiblingCommandParams) {}

	async execute() {
		const { app, settings } = useState();
		const zoom = app.flowInstance?.getZoom();

		const entry = app.entries.find((e) => e.id === this.params.entryId);
		if (!entry) return;

		const parentId = entry.parentId;
		if (!parentId) return;

		if (!this.newEntry) {
			this.newEntry = (await useAddEntry({
				entry: { parentId, content: '', ...this.params.entry }
			})) as Entry | undefined;
		}

		if (!this.newEntry) return;

		useRefresh({
			fitView: true,
			fitViewOptions: {
				maxZoom: zoom,
				minZoom: zoom,
				nodes: [{ id: this.newEntry.id }],
				duration: settings.ui.animationDuration
			}
		});
	}
}

export function useAddSibling(params: AddSiblingCommandParams) {
	const command = new AddSiblingCommand(params);
	return useExecuteCommand(command);
}
