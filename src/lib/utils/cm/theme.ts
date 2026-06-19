import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const mdHighlightStyle = HighlightStyle.define([
	{ tag: t.strong, class: 'cm-md-bold' },
	{ tag: t.emphasis, class: 'cm-md-italic' },
	{ tag: t.monospace, class: 'cm-md-code' },
	{ tag: t.strikethrough, class: 'cm-md-strike' },
	{ tag: t.heading1, class: 'cm-md-h1' },
	{ tag: t.heading2, class: 'cm-md-h2' },
	{ tag: t.heading3, class: 'cm-md-h3' },

	// Code tokens (scoped to fenced blocks via the `.cm-md-codeblock` line class in CSS).
	{
		tag: [
			t.keyword,
			t.modifier,
			t.controlKeyword,
			t.operatorKeyword,
			t.definitionKeyword,
			t.moduleKeyword
		],
		class: 'cm-tok-keyword'
	},
	{ tag: [t.string, t.special(t.string), t.regexp, t.character], class: 'cm-tok-string' },
	{ tag: [t.comment, t.lineComment, t.blockComment, t.docComment], class: 'cm-tok-comment' },
	{ tag: [t.number, t.bool, t.null, t.atom, t.literal], class: 'cm-tok-number' },
	{
		tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName, t.labelName],
		class: 'cm-tok-function'
	},
	{ tag: [t.typeName, t.className, t.namespace, t.tagName], class: 'cm-tok-type' },
	{ tag: [t.propertyName, t.attributeName], class: 'cm-tok-property' },
	{ tag: [t.escape, t.meta, t.documentMeta, t.processingInstruction], class: 'cm-tok-meta' }
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
	'.cm-gutters': {
		background: 'transparent',
		border: 'none',
		color: 'var(--muted-foreground)'
	},
	'.cm-foldGutter .cm-gutterElement': {
		padding: '0 4px',
		cursor: 'pointer',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center'
	},
	'.cm-fold-marker': {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: 'var(--muted-foreground)',
		opacity: '0',
		transition: 'opacity 120ms ease'
	},
	'.cm-fold-marker svg': { width: '16px', height: '16px' },
	// Reveal fold handles on gutter hover; a folded section keeps its handle visible.
	'.cm-foldGutter:hover .cm-fold-marker, .cm-fold-marker-closed': { opacity: '1' },
	'.cm-foldGutter .cm-gutterElement:hover .cm-fold-marker': { color: 'var(--primary)' },
	'.cm-foldPlaceholder': {
		background: 'color-mix(in oklch, var(--primary) 12%, transparent)',
		color: 'var(--primary)',
		border: 'none',
		borderRadius: '4px',
		padding: '0 6px',
		margin: '0 2px',
		fontSize: '0.85em'
	},
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

	// Fenced code: per-line background, kept as editable text (no widget).
	'.cm-md-codeblock': {
		fontFamily: 'var(--md-font-mono)',
		fontSize: '14px',
		lineHeight: '1.5',
		background: 'var(--md-code-block-bg)',
		padding: '0 0.75rem'
	},
	'.cm-md-codeblock-begin': {
		position: 'relative',
		borderTopLeftRadius: '6px',
		borderTopRightRadius: '6px'
	},
	'.cm-md-codeblock-begin[data-lang]::after': {
		content: 'attr(data-lang)',
		position: 'absolute',
		top: '0.25rem',
		right: '0.4rem',
		padding: '0.05rem 0.45rem',
		borderRadius: '999px',
		background: 'color-mix(in oklch, var(--muted-foreground) 14%, transparent)',
		color: 'var(--muted-foreground)',
		fontFamily: 'var(--md-font-mono)',
		fontSize: '0.7rem',
		lineHeight: '1.4',
		textTransform: 'uppercase',
		letterSpacing: '0.06em',
		pointerEvents: 'none',
		userSelect: 'none'
	},
	'.cm-md-codeblock-end': {
		borderBottomLeftRadius: '6px',
		borderBottomRightRadius: '6px'
	},

	// Code token colors (only apply inside fenced blocks).
	'.cm-md-codeblock .cm-tok-keyword': { color: 'var(--cm-t-keyword)' },
	'.cm-md-codeblock .cm-tok-string': { color: 'var(--cm-t-string)' },
	'.cm-md-codeblock .cm-tok-comment': { color: 'var(--cm-t-comment)', fontStyle: 'italic' },
	'.cm-md-codeblock .cm-tok-number': { color: 'var(--cm-t-number)' },
	'.cm-md-codeblock .cm-tok-function': { color: 'var(--cm-t-function)' },
	'.cm-md-codeblock .cm-tok-type': { color: 'var(--cm-t-type)' },
	'.cm-md-codeblock .cm-tok-property': { color: 'var(--cm-t-property)' },
	'.cm-md-codeblock .cm-tok-meta': { color: 'var(--cm-t-meta)' },
	'.cm-md-h1': {
		fontSize: '1.65em',
		fontWeight: '700',
		lineHeight: '1.2',
		color: 'var(--primary)'
	},
	// Full-width title underline lives on the line (see headerPlugin), so the `#`
	// mark and the heading text stay on one line.
	'.cm-md-h1-line': {
		borderBottom: '1px solid var(--primary)'
	},
	'.cm-md-h2': {
		fontSize: '1.5em',
		fontWeight: '600',
		lineHeight: '1.4',
		color: 'var(--primary)'
	},
	'.cm-md-h3': {
		fontSize: '1.25em',
		fontWeight: '600',
		lineHeight: '1.5',
		color: 'var(--primary)'
	},
	'.cm-md-quote': {
		borderLeft: '3px solid color-mix(in oklch, var(--primary) 45%, transparent)',
		paddingLeft: '0.75rem',
		color: 'var(--muted-foreground)'
	},
	'.cm-md-list-item': { paddingLeft: '1.5em', textIndent: '-1.5em' },
	'.cm-md-bullet': { color: 'oklch(0.6 0.22 300)' },
	'.cm-md-hr': {
		display: 'inline-block',
		width: '100%',
		height: '1px',
		background: 'var(--outline-variant)',
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
	},
	'.cm-md-underline': { textDecoration: 'underline' },
	'[data-placeholder]': { position: 'relative' },
	'[data-placeholder]::before': {
		content: 'attr(data-placeholder)',
		position: 'absolute',
		top: '0',
		left: '0',
		color: 'var(--muted-foreground)',
		opacity: '0.5',
		pointerEvents: 'none',
		userSelect: 'none'
	}
});
