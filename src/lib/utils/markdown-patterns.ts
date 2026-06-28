/**
 * Shared markdown syntax patterns for the whole app (CodeMirror editor plugins,
 * the preview renderer, task/tag parsing).
 *
 * Global (`/g`, `/gm`) patterns are exported as source strings so each call site
 * owns its own RegExp instance and never trips over shared `lastIndex` state.
 * Non-global patterns are exported as ready RegExp instances.
 */

/**
 * `=text=` highlight mark. Capture group 1 is the inner text. The `(?!")` guards
 * keep a delimiter from matching an HTML attribute `=` (e.g. `style="…"` in a
 * color span): without them, two `style=` attributes on a line would bracket a
 * false highlight across the spans between them. The inner text allows whole
 * `attr="…"` runs so a highlight can wrap a nested color span (`=<span …>x</span>=`).
 */
export const HIGHLIGHT_SOURCE = '=(?!")((?:[^=\\n]|="[^"\\n]*")+)=(?!")';

/**
 * Underline tag (markdown has no native underline). Matches both `<u>text</u>`
 * and `<ins>text</ins>`. Group 1 is the tag name (`u` or `ins`), group 2 the
 * inner text. The backreference keeps the closing tag in sync with the opener.
 * The inner text allows nested tags (any `<` that isn't the matching close) so
 * underline can wrap a color span (`<u><span …>x</span></u>`).
 */
export const UNDERLINE_SOURCE = '<(u|ins)>((?:[^<]|<(?!/\\1>))+)</\\1>';

/**
 * Text color (markdown has no native colored text). Stored as an inline HTML
 * span: `<span style="color: #hex">text</span>`. Group 1 is the color value,
 * group 2 the inner text. The closing tag is always `</span>` (7 chars). The
 * inner text allows nested tags (any `<` that isn't `</span>`) so a color span
 * can wrap another mark (`<span …><u>x</u></span>`).
 */
export const COLOR_SOURCE = '<span style="color:\\s*([^"]+)">((?:[^<]|<(?!/span>))+)</span>';

/** Bare `http(s)://` URL (autolink). */
export const BARE_URL_SOURCE = 'https?:\\/\\/[^\\s<>[\\]()\'"]+';

/** Fenced code block opener, capture group 1 is the language. Use with `gm`. */
export const FENCE_LANG_SOURCE = '^```([a-zA-Z][a-zA-Z0-9]*)';

/** Markdown image: `![alt](path)`. Use with `g`. */
export const IMAGE_SOURCE = '!\\[[^\\]]*\\]\\([^)]*\\)';

/** Leading ATX heading marker (`#` … `######`) plus its trailing space(s). */
export const HEADING_PREFIX_RE = /^#{1,6}\s+/;

/**
 * Checklist item, lenient. Groups: [1] prefix "- [", [2] marker, [3] "] "
 * separator, [4] text. Supports Balise's `~` in-progress marker.
 */
export const CHECKLIST_RE = /^([ \t]*- \[)( |[xX]|~)(\]\s*)(.+)$/;

/** The five signal kinds (GitHub-style alerts), in display order. */
export const SIGNAL_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

/**
 * A "signal" is a blockquote whose first line is a GitHub-style alert marker,
 * e.g. `> [!NOTE]`. The marker must be the only content on that line.
 */
export const SIGNAL_MARKER_RE = /^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;

/** Returns the signal type when `lineText` is a signal marker line, else null. */
export function signalType(lineText: string): SignalType | null {
	const m = SIGNAL_MARKER_RE.exec(lineText);
	return m ? (m[1].toLowerCase() as SignalType) : null;
}

/**
 * Checkbox at start of line: "- [ ]" / "- [x]". Group 1 = marker, group 2 = text.
 * Intentionally separate from CHECKLIST_RE: no `~` marker, different capture shape.
 */
export const CHECKBOX_RE = /^[ \t]*- \[([ xX])\] (.*)$/;
