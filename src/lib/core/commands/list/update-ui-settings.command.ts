import { useState } from '$lib/states/index.svelte';
import type { UISettings } from '$lib/states/settings.svelte';
import { useExecuteCommand } from '../manager.svelte';

class UpdateUISettingsCommand {
	constructor(private params: Partial<UISettings>) {}

	execute() {
		const { settings } = useState();

		settings.ui = {
			...settings.ui,
			...this.params
		};
	}
}

export function useUpdateUISettings(params: Partial<UISettings>) {
	const cmd = new UpdateUISettingsCommand(params);
	return useExecuteCommand(cmd);
}
