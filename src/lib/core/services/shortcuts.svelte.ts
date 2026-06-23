import { settingsService } from '$lib/core/services/settings/settings.svelte';
import { toasterService } from '$lib/core/services/toaster';
import { globalShortcut } from '$lib/core/services/system/global-shortcut';
import { resolveBinding, toAccelerator } from '$lib/core/domain/shortcut';
import * as m from '$paraglide/messages.js';

export interface ShortcutDefinition {
	id: string;
	name: () => string;
	description: () => string;
	defaultBinding: string;
	bypassGuard?: boolean;
	/** OS-level global shortcut (fires app-wide), registered via the global-shortcut plugin instead of tinykeys. */
	global?: boolean;
	run: () => void | Promise<void>;
}

/** Per-shortcut global-registration outcome. `conflict` means the OS combo is held by another app. */
export type GlobalShortcutStatus = 'registered' | 'conflict';

// Application/app-shell layer: the shortcut registry. Resolves each definition's
// effective binding (custom override over default, via `domain/shortcut`), builds
// the tinykeys map the presentation layer binds for in-app shortcuts, and applies
// the OS-level global shortcuts through the `globalShortcut` wrapper. No raw Tauri
// calls and no binding rules live here. Those are the wrapper and the domain.
class ShortcutsService {
	/** Per-shortcut registration outcome, keyed by definition id. */
	status = $state<Record<string, GlobalShortcutStatus>>({});
	/** Accelerator currently held by this app, keyed by definition id. */
	#registered = new Map<string, string>();

	getBinding(def: ShortcutDefinition): string {
		return resolveBinding(
			settingsService.shortcuts.state.customBindings,
			def.id,
			def.defaultBinding
		);
	}

	buildTinykeysMap(
		definitions: ShortcutDefinition[],
		guard?: () => boolean,
		hardGuard?: () => boolean
	): Record<string, (e: KeyboardEvent) => void> {
		const map: Record<string, (e: KeyboardEvent) => void> = {};
		for (const def of definitions) {
			if (def.global) continue;
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

	async applyAll(definitions: ShortcutDefinition[]): Promise<void> {
		/* The Rust process keeps OS registrations across a webview reload (HMR, language
		   change), which would make re-registration fail as a false "conflict". Clear any
		   stale registrations first so we always rebind with a live handler. */
		try {
			await globalShortcut.unregisterAll();
		} catch {
			/* nothing registered yet */
		}
		this.#registered.clear();

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
		const accelerator = toAccelerator(this.getBinding(def));
		const current = this.#registered.get(def.id);
		if (current === accelerator) return;

		if (current) {
			try {
				await globalShortcut.unregister(current);
			} catch {
				/* best-effort: the previous binding may already be gone */
			}
			this.#registered.delete(def.id);
		}

		try {
			await globalShortcut.register(accelerator, () => void def.run());
			this.#registered.set(def.id, accelerator);
			this.status[def.id] = 'registered';
		} catch (e) {
			console.error(`Failed to register global shortcut "${accelerator}":`, e);
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

export const shortcutsService = new ShortcutsService();
