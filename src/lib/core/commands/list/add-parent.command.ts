import type { Entry, NewEntry } from '$lib/core/entry/model';
import { useState } from '$lib/states/index.svelte';
import type { Command } from '../command';
import { useExecuteCommand } from '../manager.svelte';
import { useAddEntry } from './add-entry.command';
import { useRefresh } from './refresh.command';

export interface AddParentCommandParams {
	entryId: string;
	entry?: NewEntry;
}

class AddParentCommand implements Command {
	private entry: Entry | undefined;
	private oldParentId: string | undefined;
	private newParent: Entry | undefined;

	constructor(private params: AddParentCommandParams) {}

	async execute() {
		const { app, settings } = useState();
		const zoom = app.flowInstance?.getZoom();

		this.entry = app.entries.find((e) => e.id === this.params.entryId);

		if (!this.entry) return;

		this.oldParentId = this.entry.parentId;

		if (!this.newParent) {
			this.newParent = (await useAddEntry({
				entry: {
					content: 'New parent',
					parentId: this.entry.parentId,
					...(this.params.entry || {})
				}
			})) as Entry;
		}

		this.entry.parentId = this.newParent.id;

		useRefresh({
			fitView: true,
			fitViewOptions: {
				maxZoom: zoom,
				minZoom: zoom,
				nodes: [{ id: this.newParent.id }],
				duration: settings.ui.animationDuration
			}
		});
	}
}

export function useAddParent(params: AddParentCommandParams) {
	const command = new AddParentCommand(params);
	return useExecuteCommand(command);
}
