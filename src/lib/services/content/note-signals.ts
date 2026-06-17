type IdHandler = (id: string) => void;

type VoidHandler = () => void;

class NoteSignals {
	#selectNote = new Set<IdHandler>();
	#deleteNote = new Set<IdHandler>();
	#noteDeleted = new Set<IdHandler>();
	#notesSynced = new Set<VoidHandler>();
	#desksChanged = new Set<VoidHandler>();
	#localChange = new Set<VoidHandler>();

	onSelectNote(fn: IdHandler): () => void {
		this.#selectNote.add(fn);
		return () => this.#selectNote.delete(fn);
	}

	onDeleteNote(fn: IdHandler): () => void {
		this.#deleteNote.add(fn);
		return () => this.#deleteNote.delete(fn);
	}

	/** Fires after a note is actually deleted (not the delete-dialog intent above),
	 *  so per-note local state like remembered folds can be pruned. */
	onNoteDeleted(fn: IdHandler): () => void {
		this.#noteDeleted.add(fn);
		return () => this.#noteDeleted.delete(fn);
	}

	/** Fires after device sync applied remote changes, so the view can reload. */
	onNotesSynced(fn: VoidHandler): () => void {
		this.#notesSynced.add(fn);
		return () => this.#notesSynced.delete(fn);
	}

	/** Fires when device sync created a desk that wasn't here before, so the
	 *  desk list can pick it up. */
	onDesksChanged(fn: VoidHandler): () => void {
		this.#desksChanged.add(fn);
		return () => this.#desksChanged.delete(fn);
	}

	/** Fires after a user-initiated note write, so device sync can schedule a push.
	 *  Never fired by the sync-apply path, which would loop. */
	onLocalChange(fn: VoidHandler): () => void {
		this.#localChange.add(fn);
		return () => this.#localChange.delete(fn);
	}

	signalSelectNote(id: string): void {
		this.#selectNote.forEach((fn) => fn(id));
	}

	signalDeleteNote(id: string): void {
		this.#deleteNote.forEach((fn) => fn(id));
	}

	signalNoteDeleted(id: string): void {
		this.#noteDeleted.forEach((fn) => fn(id));
	}

	signalNotesSynced(): void {
		this.#notesSynced.forEach((fn) => fn());
	}

	signalDesksChanged(): void {
		this.#desksChanged.forEach((fn) => fn());
	}

	signalLocalChange(): void {
		this.#localChange.forEach((fn) => fn());
	}
}

export const noteSignals = new NoteSignals();
