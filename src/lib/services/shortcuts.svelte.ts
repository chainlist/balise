import { settingsService } from './settings.svelte';

export interface ShortcutDefinition {
	id: string;
	name: () => string;
	description: () => string;
	defaultBinding: string;
	bypassGuard?: boolean;
	run: () => void | Promise<void>;
}

class ShortcutsService {
	get customBindings(): Record<string, string> {
		return settingsService.customBindings;
	}

	getBinding(def: ShortcutDefinition): string {
		return settingsService.customBindings[def.id] ?? def.defaultBinding;
	}

	setBinding(id: string, binding: string): void {
		settingsService.setBinding(id, binding);
	}

	resetBinding(id: string): void {
		settingsService.resetBinding(id);
	}

	buildTinykeysMap(
		definitions: ShortcutDefinition[],
		guard?: () => boolean,
		hardGuard?: () => boolean
	): Record<string, (e: KeyboardEvent) => void> {
		const map: Record<string, (e: KeyboardEvent) => void> = {};
		for (const def of definitions) {
			const binding = this.getBinding(def);
			if (binding) {
				map[binding] = (e: KeyboardEvent) => {
					if (hardGuard && !hardGuard()) return;
					if (guard && !guard() && !def.bypassGuard) return;
					e.preventDefault();
					def.run();
				};
			}
		}
		return map;
	}
}

export const shortcutsService = new ShortcutsService();
