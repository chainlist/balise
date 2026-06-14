type IdHandler = (id: string) => void;

type VoidHandler = () => void;

class NoteSignals {
	#selectNote = new Set<IdHandler>();
	#deleteNote = new Set<IdHandler>();
	#notesSynced = new Set<VoidHandler>();

	onSelectNote(fn: IdHandler): () => void {
		this.#selectNote.add(fn);
		return () => this.#selectNote.delete(fn);
	}

	onDeleteNote(fn: IdHandler): () => void {
		this.#deleteNote.add(fn);
		return () => this.#deleteNote.delete(fn);
	}

	/** Fires after device sync applied remote changes, so the view can reload. */
	onNotesSynced(fn: VoidHandler): () => void {
		this.#notesSynced.add(fn);
		return () => this.#notesSynced.delete(fn);
	}

	signalSelectNote(id: string): void {
		this.#selectNote.forEach((fn) => fn(id));
	}

	signalDeleteNote(id: string): void {
		this.#deleteNote.forEach((fn) => fn(id));
	}

	signalNotesSynced(): void {
		this.#notesSynced.forEach((fn) => fn());
	}
}

export const noteSignals = new NoteSignals();
