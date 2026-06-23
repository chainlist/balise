import { SettingsSection } from './base.svelte';
import { DEFAULT_SHORTCUTS_SETTINGS, type ShortcutsSettings } from '$lib/domain/settings';

export class ShortcutsSettingsSection extends SettingsSection<ShortcutsSettings> {
	readonly key = 'shortcuts';
	state = $state<ShortcutsSettings>({ ...DEFAULT_SHORTCUTS_SETTINGS });

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
