import { type Store } from '@tauri-apps/plugin-store';
import { loadStore } from '$lib/core/repositories/backend/store';
import { ModalState } from './modal-state.svelte';
import { notesService } from '$lib/core/services/notes.svelte';
import { tagsService } from '$lib/core/services/tags.svelte';
import { eventBus } from '$lib/core/services/events/event-bus';
import type { FoldRange } from '$lib/utils/cm';

// Application/app-shell layer: the UI *selection* state (which tag, composed
// tags, day, note and graph view the user is looking at) plus per-note folds and
// the modal flags. The workspace (active desk + desk list) moved to `desksService`
// in Concept 03, so this is a leaf orchestrator: it imports notes/tags but nothing
// imports it (keeping it cycle-free). Selection reloads delegate to the data
// services; persistence is its own `ui-state.json` store.

export type GraphMode = 'sunburst' | 'force';

class UIState {
	modal = new ModalState();
	activeTag = $state<string | null>(null);
	composedTags = $state<string[]>([]);
	activeDay = $state<Date | null>(null);
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
		this.#store = await loadStore('ui-state.json', { autoSave: 100 });

		const [activeTag, graphMode, lastSeenVersion, noteFolds] = await Promise.all([
			this.#store.get<string>('activeTag'),
			this.#store.get<GraphMode>('graphMode'),
			this.#store.get<string>('lastSeenVersion'),
			this.#store.get<Record<string, FoldRange[]>>('noteFolds')
		]);

		this.activeTag = activeTag ?? null;
		this.graphMode = graphMode ?? 'sunburst';
		this.noteFolds = noteFolds ?? {};
		this.modal.init(this.#store, lastSeenVersion ?? '');

		// Reload the visible list when a background device sync applies changes.
		eventBus.sync.synced.on(() => void this.#reloadView());
		// Drop a deleted note's remembered folds so the store can't grow forever.
		eventBus.notes.deleted.on((id) => this.setNoteFolds(id, []));
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

	async #reloadView(): Promise<void> {
		if (this.activeDay) {
			await notesService.loadForDay(this.activeDay);
			return;
		}
		await Promise.all([
			notesService.load(this.activeTag, this.composedTags),
			tagsService.loadRelated(this.activeTag, this.composedTags)
		]);
	}

	async setActiveTag(tag: string | null): Promise<void> {
		if (this.activeTag === tag && this.activeDay === null) return;

		this.activeDay = null;
		this.activeTag = tag;
		this.composedTags = [];
		await Promise.all([
			this.#store?.set('activeTag', tag),
			notesService.load(tag),
			tagsService.loadRelated(tag)
		]);
	}

	/** Filter the note list to every note created on a local day, clearing any tag
	 *  filter. Pass `null` to drop the day filter and revert to the active tag. */
	async setActiveDay(day: Date | null): Promise<void> {
		this.activeDay = day;
		if (day) {
			this.activeTag = null;
			this.composedTags = [];
			await Promise.all([
				this.#store?.set('activeTag', null),
				notesService.loadForDay(day),
				tagsService.loadRelated(null)
			]);
		} else {
			await Promise.all([
				notesService.load(this.activeTag, this.composedTags),
				tagsService.loadRelated(this.activeTag, this.composedTags)
			]);
		}
	}

	async setGraphMode(mode: GraphMode): Promise<void> {
		this.graphMode = mode;
		await this.#store?.set('graphMode', mode);
	}

	setActiveNote(id: string): void {
		this.#noteSelection = { noteId: id, tag: this.activeTag, composedKey: this.#composedKey };
	}

	async toggleComposedTag(tag: string): Promise<void> {
		this.activeDay = null;
		this.composedTags = this.composedTags.includes(tag)
			? this.composedTags.filter((t) => t !== tag)
			: [...this.composedTags, tag];
		await Promise.all([
			notesService.load(this.activeTag, this.composedTags),
			tagsService.loadRelated(this.activeTag, this.composedTags)
		]);
	}
}

export const uiState = new UIState();
