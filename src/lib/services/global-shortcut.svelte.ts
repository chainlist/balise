import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { shortcutsService, type ShortcutDefinition } from './shortcuts.svelte';
import { toasterService } from './toaster';
import * as m from '$paraglide/messages.js';

export type GlobalShortcutStatus = 'registered' | 'conflict';

/**
 * Convert a tinykeys-style binding (e.g. `$mod+Shift+Space`) to a global-hotkey
 * accelerator. The parser is case-insensitive and accepts friendly key names, so
 * only the two synthetic modifiers need rewriting.
 */
function toAccelerator(binding: string): string {
	return binding
		.split('+')
		.map((token) => {
			if (token === '$mod') return 'CommandOrControl';
			if (token === 'Meta') return 'Super';
			return token;
		})
		.join('+');
}

class GlobalShortcutService {
	/** Per-shortcut registration outcome, keyed by definition id. `conflict` means the OS combo is held by another app. */
	status = $state<Record<string, GlobalShortcutStatus>>({});
	/** Accelerator currently held by this app, keyed by definition id. */
	#registered = new Map<string, string>();

	async applyAll(definitions: ShortcutDefinition[]): Promise<void> {
		for (const def of definitions) {
			if (def.global) await this.apply(def, true);
		}
	}

	/**
	 * Register (or re-register) a single global shortcut from its current binding.
	 * A registration failure means the combo is taken by another app: status is set
	 * to `conflict` and, when `notify` is set, the user is warned.
	 */
	async apply(def: ShortcutDefinition, notify: boolean): Promise<void> {
		const accelerator = toAccelerator(shortcutsService.getBinding(def));
		const current = this.#registered.get(def.id);
		if (current === accelerator) return;

		if (current) {
			try {
				await unregister(current);
			} catch {
				/* best-effort: the previous binding may already be gone */
			}
			this.#registered.delete(def.id);
		}

		try {
			await register(accelerator, (event) => {
				if (event.state === 'Pressed') void def.run();
			});
			this.#registered.set(def.id, accelerator);
			this.status[def.id] = 'registered';
		} catch {
			this.status[def.id] = 'conflict';
			if (notify) toasterService.warning(m.global_shortcut_conflict_title(), def.name());
		}
	}

	/** Re-probe global shortcuts we don't currently hold, in case a conflicting app released the combo. */
	async recheck(definitions: ShortcutDefinition[]): Promise<void> {
		for (const def of definitions) {
			if (def.global && !this.#registered.has(def.id)) await this.apply(def, false);
		}
	}
}

export const globalShortcutService = new GlobalShortcutService();
