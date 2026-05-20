type IdHandler = (id: string) => void;

class NoteSignals {
	#selectNote: IdHandler | null = null;
	#deleteNote: IdHandler | null = null;

	onSelectNote(fn: IdHandler): () => void {
		this.#selectNote = fn;
		return () => {
			if (this.#selectNote === fn) this.#selectNote = null;
		};
	}

	onDeleteNote(fn: IdHandler): () => void {
		this.#deleteNote = fn;
		return () => {
			if (this.#deleteNote === fn) this.#deleteNote = null;
		};
	}

	signalSelectNote(id: string): void {
		this.#selectNote?.(id);
	}

	signalDeleteNote(id: string): void {
		this.#deleteNote?.(id);
	}
}

export const noteSignals = new NoteSignals();
