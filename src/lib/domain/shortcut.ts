// Shortcut domain: the pure binding rules. The custom-over-default merge that
// resolves a shortcut's effective binding, and the tinykeys-binding → global-hotkey
// accelerator rewrite. No state, no Tauri, no Svelte.

/** A shortcut's effective binding: the user's custom override for `id`, else its
 *  default. */
export function resolveBinding(
	customBindings: Record<string, string>,
	id: string,
	defaultBinding: string
): string {
	return customBindings[id] ?? defaultBinding;
}

/**
 * Convert a tinykeys-style binding (e.g. `$mod+Shift+Space`) to a global-hotkey
 * accelerator. The accelerator parser is case-insensitive and accepts friendly key
 * names, so only the two synthetic modifiers need rewriting.
 */
export function toAccelerator(binding: string): string {
	return binding
		.split('+')
		.map((token) => {
			if (token === '$mod') return 'CommandOrControl';
			if (token === 'Meta') return 'Super';
			return token;
		})
		.join('+');
}
