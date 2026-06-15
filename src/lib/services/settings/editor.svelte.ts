import { SettingsGroup } from './base.svelte';
import type { MarkMode } from '$lib/utils/cm';

export interface EditorSettings {
	fontSize: number;
	lineHeight: number;
	markdownMarks: MarkMode;
}

export class EditorSettingsService extends SettingsGroup<EditorSettings> {
	readonly key = 'editor';
	state = $state<EditorSettings>({ fontSize: 16, lineHeight: 1.75, markdownMarks: 'cursor' });

	setFontSize(size: number): void {
		this.state.fontSize = size;
		this.applyVars();
		this.persist();
	}

	setLineHeight(value: number): void {
		this.state.lineHeight = value;
		this.applyVars();
		this.persist();
	}

	setMarkdownMarks(value: MarkMode): void {
		this.state.markdownMarks = value;
		this.persist();
	}

	applyVars(): void {
		const style = document.documentElement.style;
		style.setProperty('--editor-font-size', `${this.state.fontSize}px`);
		style.setProperty('--editor-line-height', `${this.state.lineHeight}`);
	}
}
