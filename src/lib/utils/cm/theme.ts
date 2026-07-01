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
	{ tag: t.heading4, class: 'cm-md-h4' },

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

/** Per-level heading metrics, shared by the editor theme and the settings preview
 *  so the live preview can't drift from how the editor actually renders headings. */
export const HEADING_METRICS = {
	1: { fontSize: '1.602em', fontWeight: '700', lineHeight: '1.2' },
	2: { fontSize: '1.4602em', fontWeight: '600', lineHeight: '1.4' },
	3: { fontSize: '1.224em', fontWeight: '600', lineHeight: '1.5' },
	4: { fontSize: '1.1em', fontWeight: '600', lineHeight: '1.5' }
} as const;

export const noteEditorTheme = EditorView.theme({
	'&': {
		color: 'var(--editor-text-color, var(--foreground))',
		background: 'transparent'
	},
	'&.cm-focused': { outline: 'none' },
	'.cm-scroller': {
		fontFamily: 'var(--editor-font-family, var(--font-sans))',
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
	// An explicit text color wins over the italic accent: italic nested inside a
	// color span inherits the span's color instead of --primary.
	'.cm-md-colored .cm-md-italic': { color: 'inherit' },
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
		...HEADING_METRICS[1],
		color: 'var(--editor-h1-color, var(--primary))',
		textDecoration: 'var(--editor-h1-underline, none)'
	},
	// Full-width title underline lives on the line (see headerPlugin), so the `#`
	// mark and the heading text stay on one line.
	'.cm-md-h1-line': {
		paddingTop: '0.75em'
	},
	'.cm-md-h2': {
		...HEADING_METRICS[2],
		color: 'var(--editor-h2-color, var(--primary))',
		textDecoration: 'var(--editor-h2-underline, none)'
	},
	'.cm-md-h2-line': {
		paddingTop: '0.5em'
	},
	'.cm-md-h3': {
		...HEADING_METRICS[3],
		color: 'var(--editor-h3-color, var(--primary))',
		textDecoration: 'var(--editor-h3-underline, none)'
	},
	'.cm-md-h3-line': {
		paddingTop: '0.35em'
	},
	'.cm-md-h4': {
		...HEADING_METRICS[4],
		color: 'var(--editor-h4-color, var(--primary))',
		textDecoration: 'var(--editor-h4-underline, none)'
	},
	'.cm-md-h4-line': {
		paddingTop: '0.3em'
	},
	'.cm-md-quote': {
		borderLeft: '3px solid color-mix(in oklch, var(--primary) 45%, transparent)',
		paddingLeft: '0.75rem',
		color: 'var(--muted-foreground)'
	},

	// Signals (GitHub-style alerts). Each line of a signal carries a per-type
	// `--signal-color`; the shared rule paints the left bar and tinted background.
	'.cm-md-signal': {
		borderLeft: '3px solid var(--signal-color)',
		background: 'color-mix(in oklch, var(--signal-color) 12%, transparent)',
		paddingLeft: '0.75rem'
	},
	'.cm-md-signal-note': { '--signal-color': 'var(--signal-note)' },
	'.cm-md-signal-tip': { '--signal-color': 'var(--signal-tip)' },
	'.cm-md-signal-important': { '--signal-color': 'var(--signal-important)' },
	'.cm-md-signal-warning': { '--signal-color': 'var(--signal-warning)' },
	'.cm-md-signal-caution': { '--signal-color': 'var(--signal-caution)' },
	'.cm-md-signal-first': {
		borderTopLeftRadius: '6px',
		borderTopRightRadius: '6px'
	},
	'.cm-md-signal-last': {
		paddingBottom: '0.4em',
		borderBottomLeftRadius: '6px',
		borderBottomRightRadius: '6px'
	},
	// Collapse the concealed header row to the label height and pull the body up
	// so it sits tight under the title instead of a full line-height below.
	'.cm-md-signal-marker': {
		lineHeight: '1'
	},
	'.cm-md-list-item': { paddingLeft: '1.5em', textIndent: '-1.5em' },
	'.cm-md-bullet': { color: 'var(--primary)' },
	'.cm-md-number': { color: 'var(--primary)' },
	'.cm-md-hr': {
		display: 'inline-block',
		width: '100%',
		height: '1px',
		background: 'var(--outline-variant)',
		verticalAlign: 'middle',
		margin: '2em 0'
	},
	// GFM tables (GitHub style). The wrapper is the positioned host for the hover
	// controls (overflow visible so they can float just outside the table); the
	// inner `scroll` element carries the horizontal scrollbar for wide tables.
	'.cm-md-table-wrap': {
		position: 'relative',
		width: '100%',
		margin: '0.5em 0'
	},
	'.cm-md-table-scroll': {
		overflowX: 'auto'
	},
	// Subtle handles seated on the table's top (columns) and left (rows) edges,
	// shown on hover via JS. Clicking one opens the actions menu below.
	'.cm-md-table-handle': {
		position: 'absolute',
		width: '16px',
		height: '16px',
		padding: '0',
		display: 'none',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: '4px',
		border: 'none',
		background: 'transparent',
		color: 'var(--muted-foreground)',
		fontSize: '11px',
		lineHeight: '1',
		cursor: 'pointer',
		userSelect: 'none',
		zIndex: '2'
	},
	'.cm-md-table-handle:hover': {
		background: 'color-mix(in oklch, var(--muted-foreground) 15%, transparent)',
		color: 'var(--foreground)'
	},
	// Boundary insert affordance: accent-colored + circle at a grid line, with the
	// full-length insertion-preview line and the shortcut tooltip on hover.
	'.cm-md-table-insert': {
		position: 'absolute',
		width: '16px',
		height: '16px',
		padding: '0',
		display: 'none',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: '50%',
		border: 'none',
		background: 'var(--primary)',
		color: 'var(--on-primary)',
		fontSize: '13px',
		lineHeight: '1',
		cursor: 'pointer',
		userSelect: 'none',
		boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
		zIndex: '3'
	},
	'.cm-md-table-insert svg': { display: 'block' },
	'.cm-md-table-insert-line': {
		position: 'absolute',
		display: 'none',
		background: 'var(--primary)',
		borderRadius: '1px',
		pointerEvents: 'none',
		zIndex: '2'
	},
	'.cm-md-table-tip': {
		position: 'absolute',
		display: 'none',
		whiteSpace: 'nowrap',
		padding: '3px 8px',
		lineHeight: '1.3',
		borderRadius: '5px',
		border: '1px solid var(--outline-variant)',
		background: 'var(--popover, var(--background))',
		color: 'var(--foreground)',
		fontSize: '0.75em',
		pointerEvents: 'none',
		boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
		zIndex: '4'
	},
	'.cm-md-table-menu': {
		position: 'absolute',
		zIndex: '10',
		minWidth: '168px',
		padding: '4px',
		borderRadius: '8px',
		border: '1px solid var(--outline-variant)',
		background: 'var(--popover, var(--background))',
		boxShadow: '0 6px 24px rgba(0, 0, 0, 0.18)'
	},
	'.cm-md-table-menu-item': {
		display: 'block',
		width: '100%',
		textAlign: 'left',
		padding: '6px 10px',
		border: 'none',
		background: 'transparent',
		color: 'var(--foreground)',
		font: 'inherit',
		fontSize: '0.85em',
		borderRadius: '4px',
		cursor: 'pointer'
	},
	'.cm-md-table-menu-item:hover': {
		background: 'color-mix(in oklch, var(--muted-foreground) 12%, transparent)'
	},
	'.cm-md-table-menu-sep': {
		height: '1px',
		margin: '4px 2px',
		background: 'var(--outline-variant)'
	},
	// The cell holds the padding and auto-grows in height: its ::after mirrors the
	// textarea's text (via data-value) so the grid row is as tall as the wrapped
	// content, and the textarea is stretched over it.
	'.cm-md-table-cell': {
		display: 'grid',
		padding: '6px 13px'
	},
	'.cm-md-table-cell::after': {
		content: "attr(data-value) ' '",
		visibility: 'hidden',
		whiteSpace: 'pre-wrap',
		overflowWrap: 'anywhere',
		font: 'inherit',
		gridArea: '1 / 1 / 2 / 2'
	},
	// The textarea overlays the sizing pseudo-element; it wraps the same way and is
	// otherwise invisible, inheriting the cell's typography. A click anywhere edits.
	'.cm-md-table-cell-input': {
		gridArea: '1 / 1 / 2 / 2',
		boxSizing: 'border-box',
		minWidth: '0',
		padding: '0',
		margin: '0',
		resize: 'none',
		overflow: 'hidden',
		border: 'none',
		outline: 'none',
		background: 'transparent',
		color: 'inherit',
		font: 'inherit',
		whiteSpace: 'pre-wrap',
		overflowWrap: 'anywhere',
		textAlign: 'inherit'
	},
	// Separated borders (not collapsed) so the outer border-radius is honored;
	// inner grid lines come from per-cell top/left borders, with overflow:hidden
	// clipping the cell backgrounds to the rounded corners.
	'.cm-md-table': {
		borderCollapse: 'separate',
		borderSpacing: '0',
		border: '1px solid var(--outline-variant)',
		borderRadius: '6px',
		overflow: 'hidden',
		width: '100%',
		fontSize: '0.9em',
		lineHeight: '1.5'
	},
	'.cm-md-table th, .cm-md-table td': {
		borderTop: '1px solid var(--outline-variant)',
		borderLeft: '1px solid var(--outline-variant)',
		padding: '0',
		textAlign: 'left'
	},
	'.cm-md-table thead th': { borderTop: 'none' },
	'.cm-md-table th:first-child, .cm-md-table td:first-child': { borderLeft: 'none' },
	'.cm-md-table th': {
		fontWeight: '600',
		background: 'color-mix(in oklch, var(--muted-foreground) 8%, transparent)'
	},
	'.cm-md-table tr:nth-child(2n) td': {
		background: 'color-mix(in oklch, var(--muted-foreground) 4%, transparent)'
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
	'.cm-md-highlight': {
		background: 'var(--md-highlight-bg)',
		borderRadius: '2px'
	},
	'.cm-md-underline': { textDecoration: 'underline' },
	'.cm-md-date': {
		font: 'inherit',
		color: 'inherit',
		background: 'none',
		border: 'none',
		padding: '0',
		textDecoration: 'underline',
		textDecorationColor: 'var(--md-link-decoration)'
	},
	'[data-placeholder]': { position: 'relative' },
	'[data-placeholder]::before': {
		content: 'attr(data-placeholder)',
		position: 'absolute',
		top: '0',
		left: '0',
		right: '0',
		color: 'var(--muted-foreground)',
		opacity: '0.5',
		pointerEvents: 'none',
		userSelect: 'none',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	}
});
