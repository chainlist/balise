import { load, type Store } from '@tauri-apps/plugin-store';
import { ModalState } from './modal-state.svelte';
import { openDesk, renameDeskFiles } from './desk';
import { tagsService } from './tags.svelte';
import { notesService } from './notes.svelte';
import { fsSyncService } from './fs-sync';
import { fsService } from './fs';

const defaultDesk = 'Personal';
const defaults = {
	activeDesk: defaultDesk,
	desks: [defaultDesk]
};

export type GraphMode = 'sunburst' | 'force';

class UIState {
	modal = new ModalState();
	activeDesk = $state(defaultDesk);
	desks = $state([defaultDesk] as string[]);
	activeTag = $state<string | null>(null);
	composedTags = $state<string[]>([]);
	graphMode = $state<GraphMode>('sunburst');
	ready = $state(false);

	#noteSelection = $state<{ noteId: string; tag: string | null; composedKey: string } | null>(null);
	#composedKey = $derived([...this.composedTags].sort().join('\x00'));
	activeNoteId = $derived.by(() => {
		const sel = this.#noteSelection;
		if (sel && sel.tag === this.activeTag && sel.composedKey === this.#composedKey) {
			return sel.noteId;
		}
		return notesService.notes[0]?.id ?? null;
	});

	#store: Store | null = null;

	async init(): Promise<void> {
		this.#store = await load('ui-state.json', {
			autoSave: 100,
			defaults
		});

		const [activeDesk, desks, activeTag, graphMode, lastSeenVersion] = await Promise.all([
			this.#store.get<string>('activeDesk'),
			this.#store.get<string[]>('desks'),
			this.#store.get<string>('activeTag'),
			this.#store.get<GraphMode>('graphMode'),
			this.#store.get<string>('lastSeenVersion')
		]);

		this.activeDesk = activeDesk ?? defaultDesk;
		this.desks = desks ?? [defaultDesk];
		this.activeTag = activeTag ?? null;
		this.graphMode = graphMode ?? 'sunburst';
		this.modal.init(this.#store, lastSeenVersion ?? '');

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

	async renameDesk(oldDesk: string, newDesk: string): Promise<void> {
		await renameDeskFiles(oldDesk, newDesk);
		const next = this.desks.map((d) => (d === oldDesk ? newDesk : d));
		await this.setDesks(next);
		if (this.activeDesk === oldDesk) {
			await this.switchDesk(newDesk, this.activeTag);
		}
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

	async setGraphMode(mode: GraphMode): Promise<void> {
		this.graphMode = mode;
		await this.#store?.set('graphMode', mode);
	}

	setActiveNote(id: string): void {
		this.#noteSelection = { noteId: id, tag: this.activeTag, composedKey: this.#composedKey };
	}

	async toggleComposedTag(tag: string): Promise<void> {
		const s = new Set(this.composedTags);
		if (s.has(tag)) s.delete(tag);
		else s.add(tag);
		this.composedTags = [...s];
		await Promise.all([
			notesService.load(this.activeTag, this.composedTags),
			tagsService.loadRelated(this.activeTag, this.composedTags)
		]);
	}

	async switchDesk(desk: string, activeTag: string | null = null): Promise<void> {
		const prevDesk = this.activeDesk;
		try {
			await openDesk(desk);
			fsService.setDesk(desk);
			await fsSyncService.syncDeskFiles();
			await Promise.all([
				tagsService.load(),
				notesService.load(activeTag),
				tagsService.loadRelated(activeTag)
			]);
		} catch (e) {
			// Point the DB and fs target back at the still-displayed desk so a
			// failed switch doesn't leave reads/writes hitting the new one.
			if (prevDesk !== desk) {
				await openDesk(prevDesk);
				fsService.setDesk(prevDesk);
			}
			throw e;
		}

		// Commit UI state only once every fallible step has succeeded.
		if (this.activeTag !== activeTag) {
			this.activeTag = activeTag;
		}
		this.composedTags = [];
		await this.setActiveDesk(desk);
	}
}

export const uiState = new UIState();
