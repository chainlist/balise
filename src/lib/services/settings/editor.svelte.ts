import { SettingsSection } from './base.svelte';
import {
	DEFAULT_EDITOR_SETTINGS,
	clampFontSize,
	clampLineHeight,
	type EditorSettings,
	type MarkMode
} from '$lib/domain/settings';

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

	setFontFamily(family: string): void {
		this.state.fontFamily = family;
		this.applyVars();
		this.persist();
	}

	setHeadingColor(level: 1 | 2 | 3 | 4, color: string | null): void {
		this.state[`heading${level}Color`] = color;
		this.applyVars();
		this.persist();
	}

	setHeadingUnderline(level: 1 | 2 | 3 | 4, underline: boolean): void {
		this.state[`heading${level}Underline`] = underline;
		this.applyVars();
		this.persist();
	}

	setTextColor(color: string | null): void {
		this.state.textColor = color;
		this.applyVars();
		this.persist();
	}

	applyVars(): void {
		const style = document.documentElement.style;
		style.setProperty('--editor-font-size', `${this.state.fontSize}px`);
		style.setProperty('--editor-line-height', `${this.state.lineHeight}`);
		if (this.state.fontFamily) {
			style.setProperty('--editor-font-family', `"${this.state.fontFamily}", var(--font-sans)`);
		} else {
			style.removeProperty('--editor-font-family');
		}
		([1, 2, 3, 4] as const).forEach((level) => {
			setOrRemove(style, `--editor-h${level}-color`, this.state[`heading${level}Color`]);
			setOrRemove(
				style,
				`--editor-h${level}-underline`,
				this.state[`heading${level}Underline`] ? 'underline' : null
			);
		});
		setOrRemove(style, '--editor-text-color', this.state.textColor);
	}
}

/** Set a CSS var to `value`, or remove it so the theme's fallback applies again. */
function setOrRemove(style: CSSStyleDeclaration, name: string, value: string | null): void {
	if (value) style.setProperty(name, value);
	else style.removeProperty(name);
}
