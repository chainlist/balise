import type { Entry, NewEntry } from '$lib/core/entry/model';
import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';
import { useAddEntry } from './add-entry.command';
import { useRefresh } from './refresh.command';

export interface AddChildCommandParams {
	parentId: string;
	entry?: NewEntry;
}

class AddChildCommand implements Command {
	newEntry: Entry | undefined;

	constructor(private params: AddChildCommandParams) {}

	async execute() {
		const { app, settings } = useState();
		const zoom = app.flowInstance?.getZoom();
		const entry = this.params.entry || {};

		this.newEntry = (await useAddEntry({
			entry: { parentId: this.params.parentId, content: '', ...entry }
		})) as Entry | undefined;

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

export function useAddChild(params: AddChildCommandParams) {
	const command = new AddChildCommand(params);
	return useExecuteCommand(command);
}
