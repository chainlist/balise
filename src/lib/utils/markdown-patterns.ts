/**
 * Shared markdown syntax patterns for the whole app (CodeMirror editor plugins,
 * the preview renderer, task/tag parsing).
 *
 * Global (`/g`, `/gm`) patterns are exported as source strings so each call site
 * owns its own RegExp instance and never trips over shared `lastIndex` state.
 * Non-global patterns are exported as ready RegExp instances.
 */

/** `=text=` highlight mark. Capture group 1 is the inner text. */
export const HIGHLIGHT_SOURCE = '=([^=\\n]+)=';

/**
 * Underline tag (markdown has no native underline). Matches both `<u>text</u>`
 * and `<ins>text</ins>`. Group 1 is the tag name (`u` or `ins`), group 2 the
 * inner text. The backreference keeps the closing tag in sync with the opener.
 */
export const UNDERLINE_SOURCE = '<(u|ins)>([^<]+)</\\1>';

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

/**
 * Checkbox at start of line: "- [ ]" / "- [x]". Group 1 = marker, group 2 = text.
 * Intentionally separate from CHECKLIST_RE: no `~` marker, different capture shape.
 */
export const CHECKBOX_RE = /^[ \t]*- \[([ xX])\] (.*)$/;
