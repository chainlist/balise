import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

// OS wrapper: the single home for the Tauri global-shortcut plugin. It hides the
// plugin import and the key-event shape (the `Pressed` edge) so the app-shell
// `shortcutsService` works in terms of an accelerator string and a plain callback.
export const globalShortcut = {
	/** Register an OS-wide accelerator; `onPressed` fires once per key-down. */
	register(accelerator: string, onPressed: () => void): Promise<void> {
		return register(accelerator, (event) => {
			if (event.state === 'Pressed') onPressed();
		});
	},

	unregister(accelerator: string): Promise<void> {
		return unregister(accelerator);
	},

	unregisterAll(): Promise<void> {
		return unregisterAll();
	}
};
