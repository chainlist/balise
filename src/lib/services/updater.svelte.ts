import { updater, type Update, type DownloadEvent } from '$lib/services/system/updater';
import { toasterService, errorMessage } from '$lib/services/toaster';
import { settingsService } from '$lib/services/settings/settings.svelte';
import * as m from '$paraglide/messages.js';

type UpdateStatus =
	| 'idle'
	| 'checking'
	| 'up_to_date'
	| 'available'
	| 'downloading'
	| 'done'
	| 'error';

// Application/app-shell layer: owns the update status, the held `Update`, and the
// download progress. The Tauri check/install/relaunch calls live in the
// `updater` OS wrapper; every failure surfaces a toast.
class UpdaterService {
	status = $state<UpdateStatus>('idle');
	updateInfo = $state<Update | null>(null);
	progress = $state(0);

	async checkOnStartup(): Promise<void> {
		if (!import.meta.env.PROD || !settingsService.general.state.autoUpdate) return;
		await this.#check();
	}

	async checkManually(): Promise<void> {
		await this.#check();
		if (this.status === 'up_to_date') {
			toasterService.success(m.settings_about_up_to_date());
		} else if (this.status === 'error') {
			toasterService.error(m.settings_about_check_failed());
		}
	}

	async #check(): Promise<void> {
		if (this.status === 'checking') return;
		this.status = 'checking';
		try {
			const update = await updater.check();
			if (update) {
				this.updateInfo = update;
				this.status = 'available';
			} else {
				this.status = 'up_to_date';
			}
		} catch {
			this.status = 'error';
		}
	}

	async install(): Promise<void> {
		if (!this.updateInfo) return;
		this.status = 'downloading';
		this.progress = 0;
		let downloaded = 0;
		let total = 0;
		try {
			await updater.install(this.updateInfo, (event: DownloadEvent) => {
				if (event.event === 'Started') {
					total = event.data.contentLength ?? 0;
				} else if (event.event === 'Progress') {
					downloaded += event.data.chunkLength;
					this.progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
				} else if (event.event === 'Finished') {
					this.status = 'done';
				}
			});
		} catch (e) {
			this.status = 'available';
			toasterService.error(m.updater_install_error_failed(), errorMessage(e));
		}
	}
}

export const updaterService = new UpdaterService();
