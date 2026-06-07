type IdHandler = (id: string) => void;

class NoteSignals {
	#selectNote = new Set<IdHandler>();
	#deleteNote = new Set<IdHandler>();

	onSelectNote(fn: IdHandler): () => void {
		this.#selectNote.add(fn);
		return () => this.#selectNote.delete(fn);
	}

	onDeleteNote(fn: IdHandler): () => void {
		this.#deleteNote.add(fn);
		return () => this.#deleteNote.delete(fn);
	}

	signalSelectNote(id: string): void {
		this.#selectNote.forEach((fn) => fn(id));
	}

	signalDeleteNote(id: string): void {
		this.#deleteNote.forEach((fn) => fn(id));
	}
}

export const noteSignals = new NoteSignals();
