const STORAGE_KEY = 'fil-editor-settings';
const DEFAULT_FONT_SIZE = 16;

function load(): { fontSize: number } {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : { fontSize: DEFAULT_FONT_SIZE };
	} catch {
		return { fontSize: DEFAULT_FONT_SIZE };
	}
}

export const editorState = $state({ fontSize: DEFAULT_FONT_SIZE });

function applyFontSize(size: number): void {
	document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
}

export function setFontSize(size: number): void {
	editorState.fontSize = size;
	applyFontSize(size);
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: size }));
}

export function initEditorSettings(): void {
	const saved = load();
	editorState.fontSize = saved.fontSize;
	applyFontSize(saved.fontSize);
}
