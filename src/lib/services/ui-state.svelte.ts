import { load, type Store } from '@tauri-apps/plugin-store';
import { openDesk } from './desk';
import { tagsService } from './tags.svelte';
import { notesService } from './notes.svelte';
import { fsSyncService } from './fs-sync';
import { fsService } from './fs';

const defaultDesk = 'Personal';
const defaults = {
	activeDesk: defaultDesk,
	desks: [defaultDesk]
};

class UIState {
	activeDesk = $state(defaultDesk);
	desks = $state([defaultDesk] as string[]);
	activeTag = $state<string | null>(null);
	composedTags = $state<string[]>([]);
	ready = $state(false);
	isSettingsOpen = $state(false);
	isCommandPaletteOpen = $state(false);
	isCapturingShortcut = $state(false);
	isWizardOpen = $state(false);
	isZenModeActive = $state(false);
	activeNoteId = $state<string | null>(null);

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load('ui-state.json', {
			autoSave: 100,
			defaults
		});

		const [activeDesk, desks, activeTag] = await Promise.all([
			this.#store.get<string>('activeDesk'),
			this.#store.get<string[]>('desks'),
			this.#store.get<string>('activeTag')
		]);

		this.activeDesk = activeDesk ?? defaultDesk;
		this.desks = desks ?? [defaultDesk];
		this.activeTag = activeTag ?? null;

		if (!this.desks.includes(this.activeDesk)) {
			this.desks = [...this.desks, this.activeDesk];
		}
	}

	async setActiveDesk(desk: string): Promise<void> {
		this.activeDesk = desk;
		await this.#store?.set('activeDesk', desk);
	}

	async setDesks(desks: string[]): Promise<void> {
		this.desks = desks;
		await this.#store?.set('desks', desks);
	}

	async addDesk(desk: string): Promise<void> {
		if (this.desks.includes(desk)) return;
		await this.setDesks([...this.desks, desk]);
	}

	async removeDesk(desk: string): Promise<void> {
		if (!this.desks.includes(desk)) return;
		if (this.desks.length <= 1) {
			throw new Error('You must keep at least one desk.');
		}

		const next = this.desks.filter((value) => value !== desk);
		await this.setDesks(next);

		if (this.activeDesk === desk) {
			await this.setActiveDesk(next[0]);
		}
	}

	async toggleZenMode() {
		this.isZenModeActive = !this.isZenModeActive;
	}

	async setActiveTag(tag: string | null): Promise<void> {
		if (this.activeTag === tag) return;

		this.activeTag = tag;
		this.composedTags = [];
		await Promise.all([
			this.#store?.set('activeTag', tag),
			notesService.load(tag),
			tagsService.loadRelated(tag)
		]);
	}

	async toggleComposedTag(tag: string): Promise<void> {
		const current = this.composedTags;
		const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
		this.composedTags = next;
		await Promise.all([
			notesService.load(this.activeTag, next),
			tagsService.loadRelated(this.activeTag, next)
		]);
	}

	async switchDesk(desk: string, activeTag: string | null = null): Promise<void> {
		if (this.activeTag !== activeTag) {
			this.activeTag = activeTag;
		}

		this.composedTags = [];
		await openDesk(desk);
		fsService.setDesk(desk);
		await fsSyncService.syncDeskFiles();
		await Promise.all([
			tagsService.load(),
			notesService.load(activeTag),
			tagsService.loadRelated(activeTag)
		]);
		await this.setActiveDesk(desk);
	}
}

export const uiState = new UIState();
