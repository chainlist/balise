const STORAGE_KEY = 'fil-editor-settings';
const DEFAULT_FONT_SIZE = 16;

class EditorService {
	fontSize = $state(DEFAULT_FONT_SIZE);

	#apply(): void {
		document.documentElement.style.setProperty('--editor-font-size', `${this.fontSize}px`);
	}

	setFontSize(size: number): void {
		this.fontSize = size;
		this.#apply();
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize: size }));
	}

	init(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				this.fontSize = parsed.fontSize ?? DEFAULT_FONT_SIZE;
			}
		} catch {
			// ignore
		}
		this.#apply();
	}
}

export const editorService = new EditorService();
