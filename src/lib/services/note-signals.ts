type IdHandler = (id: string) => void;

let _selectNote: IdHandler | null = null;
let _deleteNote: IdHandler | null = null;

export function onSelectNote(fn: IdHandler): () => void {
	_selectNote = fn;
	return () => { if (_selectNote === fn) _selectNote = null; };
}

export function onDeleteNote(fn: IdHandler): () => void {
	_deleteNote = fn;
	return () => { if (_deleteNote === fn) _deleteNote = null; };
}

export function signalSelectNote(id: string): void { _selectNote?.(id); }
export function signalDeleteNote(id: string): void { _deleteNote?.(id); }
