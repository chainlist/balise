import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const mdHighlightStyle = HighlightStyle.define([
	{ tag: tags.strong, class: 'cm-md-bold' },
	{ tag: tags.emphasis, class: 'cm-md-italic' },
	{ tag: tags.monospace, class: 'cm-md-code' },
	{ tag: tags.strikethrough, class: 'cm-md-strike' },
	{ tag: tags.heading1, class: 'cm-md-h1' },
	{ tag: tags.heading2, class: 'cm-md-h2' },
	{ tag: tags.heading3, class: 'cm-md-h3' }
]);

export const mdSyntaxHighlighting = syntaxHighlighting(mdHighlightStyle);

export const noteEditorTheme = EditorView.theme({
	'&': {
		color: 'var(--foreground)',
		background: 'transparent'
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': {
		fontFamily: 'var(--font-sans)',
		fontSize: 'var(--editor-font-size, 16px)',
		overflow: 'visible',
		padding: '1.5rem',
		lineHeight: 'var(--editor-line-height, 1.75)'
	},
	'.cm-content': { padding: '0', caretColor: 'var(--foreground)' },
	'.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
	'.cm-line': { padding: '0' },
	'.cm-activeLine': { background: 'transparent' },
	'.cm-gutters': { display: 'none' },
	'&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
		background: 'color-mix(in oklch, var(--primary) 20%, transparent)'
	},

	// Markdown decorations
	'.cm-md-bold': { fontWeight: '600' },
	'.cm-md-italic': { fontStyle: 'italic', color: 'var(--primary)' },
	'.cm-md-strike': { textDecoration: 'line-through', opacity: '0.7' },
	'.cm-md-code': {
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.875em',
		background: 'var(--md-code-bg)',
		borderRadius: '3px',
		padding: '1px 3px'
	},
	'.cm-md-h1': {
		fontSize: '1.65em',
		fontWeight: '700',
		lineHeight: '1.2',
		border: '1px solid transparent',
		borderBottomColor: 'var(--primary)',
		width: '100%',
		display: 'inline-block'
	},
	'.cm-md-h2': { fontSize: '1.5em', fontWeight: '600', lineHeight: '1.4' },
	'.cm-md-h3': { fontSize: '1.25em', fontWeight: '600', lineHeight: '1.5' },
	'.cm-md-list-item': { paddingLeft: '1.5em', textIndent: '-1.5em' },
	'.cm-md-bullet': { color: 'oklch(0.6 0.22 300)' },
	'.cm-md-hr': {
		display: 'inline-block',
		width: '100%',
		height: '1px',
		background: 'var(--border)',
		verticalAlign: 'middle'
	},
	'.cm-widgetBuffer': { lineHeight: '0' },
	'.cm-md-code-block': {
		display: 'flex',
		flexDirection: 'column',
		borderRadius: '6px',
		overflow: 'hidden',
		margin: '4px 0',
		lineHeight: 'normal'
	},
	'.cm-md-code-header': {
		display: 'block',
		padding: '4px 12px',
		background: 'var(--md-code-bg)'
	},
	'.cm-md-code-lang': {
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.7em',
		color: 'var(--muted-foreground)',
		textTransform: 'uppercase',
		letterSpacing: '0.06em'
	},
	'.cm-md-code-pre': {
		margin: '0',
		padding: '10px 12px',
		background: 'color-mix(in oklch, var(--muted-foreground) 6%, transparent)',
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.875em',
		lineHeight: '1.6',
		overflowX: 'auto',
		whiteSpace: 'pre'
	},
	'.cm-md-code-footer': {
		display: 'block',
		height: '6px',
		background: 'var(--md-code-bg)'
	},
	'.cm-md-link': {
		color: 'var(--primary)',
		textDecoration: 'underline',
		textDecorationColor: 'var(--md-link-decoration)'
	},
	'.cm-md-tag': {
		color: 'var(--primary)',
		background: 'color-mix(in oklch, var(--primary) 12%, transparent)',
		borderRadius: '0.5rem',
		padding: '0 calc(var(--spacing) * 1.5)'
	},
	'.cm-md-highlight': {
		background: 'var(--md-highlight-bg)',
		borderRadius: '2px'
	}
});
