import { load, type Store } from '@tauri-apps/plugin-store';
import { ModalState } from './modal-state.svelte';
import { listDesks, openDesk, renameDeskFiles } from '../platform/desk';
import { tagsService } from '../content/tags.svelte';
import { notesService } from '../content/notes.svelte';
import { fileMirrorService } from '../content/file-mirror';
import { fsService } from '../platform/fs';
import { settingsService } from '../settings/settings.svelte';
import { noteSignals } from '../content/note-signals';
import { resolveStorePath } from '../platform/store-path';
import type { FoldRange } from '$lib/utils/cm';

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

	/** Per-note folded ranges, keyed by note id, persisted so a note reopens with
	 *  the same sections collapsed. Local to this device (not synced). */
	noteFolds = $state<Record<string, FoldRange[]>>({});

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
		this.#store = await load(await resolveStorePath('ui-state.json'), {
			autoSave: 100,
			defaults
		});

		const [activeDesk, desks, activeTag, graphMode, lastSeenVersion, noteFolds] = await Promise.all([
			this.#store.get<string>('activeDesk'),
			this.#store.get<string[]>('desks'),
			this.#store.get<string>('activeTag'),
			this.#store.get<GraphMode>('graphMode'),
			this.#store.get<string>('lastSeenVersion'),
			this.#store.get<Record<string, FoldRange[]>>('noteFolds')
		]);

		this.activeDesk = activeDesk ?? defaultDesk;
		this.desks = desks ?? [defaultDesk];
		this.activeTag = activeTag ?? null;
		this.graphMode = graphMode ?? 'sunburst';
		this.noteFolds = noteFolds ?? {};
		this.modal.init(this.#store, lastSeenVersion ?? '');

		if (!this.desks.includes(this.activeDesk)) {
			this.desks = [...this.desks, this.activeDesk];
		}

		// Reload the visible list when a background device sync applies changes.
		noteSignals.onNotesSynced(() => void this.#reloadView());
		// Surface desks a background sync materialised from a peer.
		noteSignals.onDesksChanged(() => void this.#mergeDesksFromDisk());
		// Drop a deleted note's remembered folds so the store can't grow forever.
		noteSignals.onNoteDeleted((id) => this.setNoteFolds(id, []));
	}

	getNoteFolds(id: string): FoldRange[] {
		return this.noteFolds[id] ?? [];
	}

	/** Persist a note's folded ranges; an empty list drops the entry entirely. */
	setNoteFolds(id: string, folds: FoldRange[]): void {
		if (folds.length === 0) {
			if (!(id in this.noteFolds)) return;
			delete this.noteFolds[id];
		} else {
			this.noteFolds[id] = folds;
		}
		void this.#store?.set('noteFolds', this.noteFolds);
	}

	/** Folds any on-disk desks not yet in the list into it (e.g. one a peer just
	 *  synced over). Persisted, so a synced desk survives a restart. Drops any
	 *  dot-prefixed name (e.g. a `.balise` settings folder wrongly persisted by an
	 *  earlier build) so the stored list self-heals. */
	async #mergeDesksFromDisk(): Promise<void> {
		const found = await listDesks();
		const merged = [...new Set([...this.desks, ...found])].filter((d) => !d.startsWith('.'));
		if (merged.length !== this.desks.length) await this.setDesks(merged);
	}

	async #reloadView(): Promise<void> {
		await Promise.all([
			notesService.load(this.activeTag, this.composedTags),
			tagsService.loadRelated(this.activeTag, this.composedTags)
		]);
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
		settingsService.sync.renameSharedDesk(oldDesk, newDesk);
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
		settingsService.sync.forgetDesk(desk);

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
			await fileMirrorService.syncDeskFiles();
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
