import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toasterService, errorMessage } from '../app/toaster';
import { settingsService } from '../settings/settings.svelte';
import * as m from '$paraglide/messages.js';

type UpdateStatus =
	| 'idle'
	| 'checking'
	| 'up_to_date'
	| 'available'
	| 'downloading'
	| 'done'
	| 'error';

class UpdaterService {
	status = $state<UpdateStatus>('idle');
	updateInfo = $state<Update | null>(null);
	progress = $state(0);

	async checkOnStartup() {
		if (!import.meta.env.PROD || !settingsService.general.state.autoUpdate) return;
		await this._check();
	}

	async checkManually() {
		await this._check();
		if (this.status === 'up_to_date') {
			toasterService.success(m.settings_about_up_to_date());
		} else if (this.status === 'error') {
			toasterService.error(m.settings_about_check_failed());
		}
	}

	private async _check() {
		if (this.status === 'checking') return;
		this.status = 'checking';
		try {
			const update = await check();
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

	async install() {
		if (!this.updateInfo) return;
		this.status = 'downloading';
		this.progress = 0;
		let downloaded = 0;
		let total = 0;
		try {
			await this.updateInfo.downloadAndInstall((event) => {
				if (event.event === 'Started') {
					total = event.data.contentLength ?? 0;
				} else if (event.event === 'Progress') {
					downloaded += event.data.chunkLength;
					this.progress = total > 0 ? Math.round((downloaded / total) * 100) : 0;
				} else if (event.event === 'Finished') {
					this.status = 'done';
				}
			});
			await relaunch();
		} catch (e) {
			this.status = 'available';
			toasterService.error(m.updater_install_error_failed(), errorMessage(e));
		}
	}
}

export const updaterService = new UpdaterService();
