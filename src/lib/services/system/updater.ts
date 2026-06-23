import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type { Update, DownloadEvent };

// OS wrapper: the single home for the Tauri updater + process plugins. Exposes the
// version check and a download-then-relaunch install; the app-shell
// `updaterService` keeps the status/progress state and the progress-event maths.
export const updater = {
	/** Check for an available update; `null` means up to date. */
	check(): Promise<Update | null> {
		return check();
	},

	/** Download and install `update` (reporting progress via `onEvent`), then relaunch. */
	async install(update: Update, onEvent: (event: DownloadEvent) => void): Promise<void> {
		await update.downloadAndInstall(onEvent);
		await relaunch();
	}
};
