export interface ShortcutDefinition {
	id: string;
	name: string;
	description: string;
	defaultBinding: string;
	bypassGuard?: boolean;
	run: () => void | Promise<void>;
}

const STORAGE_KEY = 'fil-shortcut-bindings';

class ShortcutsService {
	customBindings = $state<Record<string, string>>({});

	init(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			this.customBindings = stored ? JSON.parse(stored) : {};
		} catch {
			this.customBindings = {};
		}
	}

	getBinding(def: ShortcutDefinition): string {
		return this.customBindings[def.id] ?? def.defaultBinding;
	}

	setBinding(id: string, binding: string): void {
		this.customBindings = { ...this.customBindings, [id]: binding };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customBindings));
	}

	resetBinding(id: string): void {
		const next = { ...this.customBindings };
		delete next[id];
		this.customBindings = next;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customBindings));
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
