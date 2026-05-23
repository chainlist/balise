type IdHandler = (id: string) => void;

class NoteSignals {
	#selectNote: IdHandler[] = [];
	#deleteNote: IdHandler[] = [];

	onSelectNote(fn: IdHandler): () => void {
		this.#selectNote.push(fn);
		return () => {
			this.#selectNote = this.#selectNote.filter((h) => h !== fn);
		};
	}

	onDeleteNote(fn: IdHandler): () => void {
		this.#deleteNote.push(fn);
		return () => {
			this.#deleteNote = this.#deleteNote.filter((h) => h !== fn);
		};
	}

	signalSelectNote(id: string): void {
		this.#selectNote.forEach((fn) => fn(id));
	}

	signalDeleteNote(id: string): void {
		this.#deleteNote.forEach((fn) => fn(id));
	}
}

export const noteSignals = new NoteSignals();
