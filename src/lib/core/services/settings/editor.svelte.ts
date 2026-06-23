import { SettingsSection } from './base.svelte';
import {
	DEFAULT_EDITOR_SETTINGS,
	clampFontSize,
	clampLineHeight,
	type EditorSettings,
	type MarkMode
} from '$lib/core/domain/settings';

// NOTE (Concept 07): `applyVars` writes CSS variables to `document`, an app-shell
// concern kept intact here; Concept 08 should relocate the DOM write.

export class EditorSettingsSection extends SettingsSection<EditorSettings> {
	readonly key = 'editor';
	state = $state<EditorSettings>({ ...DEFAULT_EDITOR_SETTINGS });

	setFontSize(size: number): void {
		this.state.fontSize = clampFontSize(size);
		this.applyVars();
		this.persist();
	}

	setLineHeight(value: number): void {
		this.state.lineHeight = clampLineHeight(value);
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
