import { SettingsGroup } from './base.svelte';

export interface ShortcutsSettings {
	customBindings: Record<string, string>;
}

export class ShortcutsSettingsService extends SettingsGroup<ShortcutsSettings> {
	readonly key = 'shortcuts';
	state = $state<ShortcutsSettings>({ customBindings: {} });

	setBinding(id: string, binding: string): void {
		this.state.customBindings = { ...this.state.customBindings, [id]: binding };
		this.persist();
	}

	resetBinding(id: string): void {
		const next = { ...this.state.customBindings };
		delete next[id];
		this.state.customBindings = next;
		this.persist();
	}
}
