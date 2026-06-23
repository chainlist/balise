import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { exit } from '@tauri-apps/plugin-process';
import * as m from '$paraglide/messages.js';

// OS wrapper: the system-tray icon, its menu, and the window show/hide it drives
// are pure Tauri/window side effects, so the whole tray lives here rather than in
// an app-shell service.
const TRAY_ID = 'balise-tray';

class TrayService {
	#tray: TrayIcon | null = null;

	async show() {
		await this.#tray?.setVisible(true);
	}

	async hide() {
		await this.#tray?.setVisible(false);
	}

	async remove() {
		await TrayIcon.removeById(TRAY_ID).catch(() => {});
		this.#tray = null;
	}

	async init() {
		await this.remove();

		const menu = await Menu.new({
			items: [
				{ id: 'open', text: m.tray_open(), action: () => void this.#openMainWindow() },
				{ id: 'quick_add', text: m.tray_quick_add(), action: () => void this.#toggleQuickWindow() },
				{ id: 'quit', text: m.tray_quit(), action: () => void exit(0) }
			]
		});

		this.#tray = await TrayIcon.new({
			id: TRAY_ID,
			icon: (await defaultWindowIcon()) ?? undefined,
			menu,
			menuOnLeftClick: false,
			tooltip: 'Balise',
			action: (event) => {
				if (event.type === 'Click' && event.button === 'Left' && event.buttonState === 'Up') {
					void this.#handleLeftClick();
				}
			}
		});
		await this.#tray.setVisible(false);
	}

	async #openMainWindow() {
		const win = await WebviewWindow.getByLabel('main');
		if (win) {
			await win.show();
			await win.setFocus();
			await this.hide();
		}
	}

	async #toggleQuickWindow() {
		const win = await WebviewWindow.getByLabel('quick');
		if (!win) return;
		if (await win.isVisible()) {
			await win.setFocus();
		} else {
			await win.show();
			await win.setFocus();
		}
	}

	async #handleLeftClick() {
		const quickWin = await WebviewWindow.getByLabel('quick');
		if (quickWin && (await quickWin.isVisible())) {
			await quickWin.hide();
		}
		await this.#openMainWindow();
	}
}

export const trayService = new TrayService();
