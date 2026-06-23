import { type Store } from '@tauri-apps/plugin-store';
import { loadStore } from '$lib/repositories/backend/store';
import { deskRepo } from '$lib/repositories/desk.repo';
import { notesService } from '$lib/services/notes.svelte';
import { tagsService } from '$lib/services/tags.svelte';
import { eventBus } from '$lib/services/events/event-bus';
import { DEFAULT_DESK, canRemoveDesk, isAppDataFolder } from '$lib/domain/desk';
import { fsSyncService } from '$lib/services/sync/fs-sync';

// Application layer: the workspace use cases plus the reactive desk list and active
// desk. No SQL, no `getDb`, no filesystem calls — `deskRepo` hides the folder/DB
// lifecycle and the domain owns the name/list rules. Each method is a thin ordered
// list of steps. Persistence lives in a dedicated `workspace.json` store this
// service owns (Concept 09 cutover migrates `activeDesk`/`desks` here from the old
// `ui-state.json`). The UI-selection state (activeTag, activeDay, composedTags)
// stays with `ui-state` (Concept 08); `switchDesk` only uses `activeTag` to reload.

const defaults = {
	activeDesk: DEFAULT_DESK,
	desks: [DEFAULT_DESK]
};

class DesksService {
	desks = $state<string[]>([DEFAULT_DESK]);
	activeDesk = $state(DEFAULT_DESK);

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await loadStore('workspace.json', { autoSave: 100, defaults });

		const [activeDesk, desks] = await Promise.all([
			this.#store.get<string>('activeDesk'),
			this.#store.get<string[]>('desks')
		]);

		this.activeDesk = activeDesk ?? DEFAULT_DESK;
		this.desks = desks ?? [DEFAULT_DESK];

		if (!this.desks.includes(this.activeDesk)) {
			this.desks = [...this.desks, this.activeDesk];
		}

		// Surface desks a background device sync materialised from a peer.
		eventBus.desks.created.on(() => void this.#mergeDesksFromDisk());
	}

	/** Absolute path of the desks root, for the new-desk wizard. Thin passthrough so
	 *  presentation reaches it through a service, not the repo (Concept 09 repoints
	 *  WizardModal here). */
	getBaseDir(): Promise<string> {
		return deskRepo.getBaseDir();
	}

	/** Folds any on-disk desks not yet in the list into it (e.g. one a peer just
	 *  synced over). Persisted, so a synced desk survives a restart. Drops any
	 *  app-data (dot-prefixed) name so the stored list self-heals. */
	async #mergeDesksFromDisk(): Promise<void> {
		const found = await deskRepo.list();
		const merged = [...new Set([...this.desks, ...found])].filter((d) => !isAppDataFolder(d));
		if (merged.length !== this.desks.length) await this.setDesks(merged);
	}

	async setDesks(desks: string[]): Promise<void> {
		this.desks = desks;
		await this.#store?.set('desks', desks);
	}

	async setActiveDesk(desk: string): Promise<void> {
		this.activeDesk = desk;
		await this.#store?.set('activeDesk', desk);
	}

	/** Re-read the active desk from the shared store (another window may have changed it). */
	async refreshActiveDesk(): Promise<string> {
		const desk = (await this.#store?.get<string>('activeDesk')) ?? this.activeDesk;
		this.activeDesk = desk;
		return desk;
	}

	async addDesk(desk: string): Promise<void> {
		if (this.desks.includes(desk)) return;
		await this.setDesks([...this.desks, desk]);
	}

	async renameDesk(
		oldDesk: string,
		newDesk: string,
		activeTag: string | null = null
	): Promise<void> {
		await deskRepo.rename(oldDesk, newDesk);
		eventBus.desks.renamed.emit(oldDesk, newDesk);
		const next = this.desks.map((d) => (d === oldDesk ? newDesk : d));
		await this.setDesks(next);
		if (this.activeDesk === oldDesk) {
			await this.switchDesk(newDesk, activeTag);
		}
	}

	/** Full delete use case (presentation can't call the repo directly): switch away
	 *  to a fallback desk if the deleted one is active, erase its files, then drop it
	 *  from the list. The old orchestration lived in `DeleteDeskSheet`; the UI-selection
	 *  reset after a switch-away stays with `uiState` (the sheet calls `clearSelection`). */
	async deleteDesk(desk: string): Promise<void> {
		if (!this.desks.includes(desk)) return;
		if (!canRemoveDesk(this.desks)) {
			throw new Error('You must keep at least one desk.');
		}

		if (this.activeDesk === desk) {
			const fallback = this.desks.find((d) => d !== desk);
			if (fallback) await this.switchDesk(fallback);
		}

		await deskRepo.delete(desk);
		await this.removeDesk(desk);
	}

	async removeDesk(desk: string): Promise<void> {
		if (!this.desks.includes(desk)) return;
		if (!canRemoveDesk(this.desks)) {
			throw new Error('You must keep at least one desk.');
		}

		const next = this.desks.filter((value) => value !== desk);
		await this.setDesks(next);
		eventBus.desks.removed.emit(desk);

		if (this.activeDesk === desk) {
			await this.setActiveDesk(next[0]);
		}
	}

	async switchDesk(desk: string, activeTag: string | null = null): Promise<void> {
		const prevDesk = this.activeDesk;
		try {
			await deskRepo.open(desk);
			await fsSyncService.syncDeskFiles();
			await Promise.all([
				tagsService.load(),
				notesService.load(activeTag),
				tagsService.loadRelated(activeTag)
			]);
		} catch (e) {
			// Point the DB and fs target back at the still-displayed desk so a failed
			// switch doesn't leave reads/writes hitting the new one.
			if (prevDesk !== desk) {
				await deskRepo.open(prevDesk);
			}
			throw e;
		}

		// Commit the active desk only once every fallible step has succeeded.
		await this.setActiveDesk(desk);
	}
}

export const desksService = new DesksService();
