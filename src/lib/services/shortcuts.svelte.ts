export interface ShortcutDefinition {
	id: string;
	name: string;
	description: string;
	defaultBinding: string;
	bypassGuard?: boolean;
	run: () => void | Promise<void>;
}

const STORAGE_KEY = 'fil-shortcut-bindings';

function loadBindings(): Record<string, string> {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

export const shortcutState = $state({
	customBindings: {} as Record<string, string>
});

export function initShortcuts(): void {
	shortcutState.customBindings = loadBindings();
}

export function getBinding(def: ShortcutDefinition): string {
	return shortcutState.customBindings[def.id] ?? def.defaultBinding;
}

export function setBinding(id: string, binding: string): void {
	shortcutState.customBindings = { ...shortcutState.customBindings, [id]: binding };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcutState.customBindings));
}

export function resetBinding(id: string): void {
	const next = { ...shortcutState.customBindings };
	delete next[id];
	shortcutState.customBindings = next;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcutState.customBindings));
}

export function buildTinykeysMap(
	definitions: ShortcutDefinition[],
	guard?: () => boolean,
	hardGuard?: () => boolean
): Record<string, (e: KeyboardEvent) => void> {
	const map: Record<string, (e: KeyboardEvent) => void> = {};
	for (const def of definitions) {
		const binding = getBinding(def);
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
