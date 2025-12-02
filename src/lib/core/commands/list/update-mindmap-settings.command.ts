import { useState } from '$lib/states/index.svelte';
import type { MindmapSettings } from '$lib/states/settings.svelte';
import { useExecuteCommand } from '../manager.svelte';

class UpdateMindmapSettingsCommand {
	constructor(private params: Partial<MindmapSettings>) {}

	execute() {
		const { settings } = useState();

		settings.mindmap = {
			...settings.mindmap,
			...this.params
		};
	}
}

export function useUpdateUISettings(params: Partial<MindmapSettings>) {
	const cmd = new UpdateMindmapSettingsCommand(params);
	return useExecuteCommand(cmd);
}
