import { Marked, Renderer, type MarkedExtension, type Tokens } from 'marked';
import type { TokenizerAndRendererExtension } from 'marked';
import { highlightExtension } from '$lib/utils/markdown-render';
import { isImageUrl } from '$lib/utils/cm/embeds.config';
import { TAG_PATTERN_SOURCE } from '$lib/domain/tag';
import { signalType } from '$lib/utils/markdown-patterns';

// Markdown → HTML for the offscreen export page. The editor draws a note as
// CodeMirror decorations, which cannot be rasterised (only the scrolled viewport
// is ever in the DOM), so the export re-renders the same markdown and mirrors
// those decorations class for class. Whatever the editor draws with a Svelte
// component — link card, tag chip, checkbox, signal header — is emitted here as
// an empty placeholder and filled by `hydrateExport` with that very component,
// so the two surfaces cannot drift apart.

/** Escape a string for use inside a double-quoted HTML attribute. */
function attr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const TAG_TOKEN_RE = new RegExp(`^${TAG_PATTERN_SOURCE}`);

/** `#tag` → the chip the editor's tagPlugin shows. The label and color live in
 *  `tagsService`, so only the name travels in the placeholder. */
const tagToken: TokenizerAndRendererExtension = {
	name: 'tag',
	level: 'inline',
	start: (src: string) => src.indexOf('#'),
	tokenizer(src: string) {
		const match = TAG_TOKEN_RE.exec(src);
		if (match) return { type: 'tag', raw: match[0], text: match[1] };
	},
	renderer(token: Tokens.Generic) {
		return `<span class="ex-tag" data-tag="${attr(token.text)}"></span>`;
	}
};

/** Strip one level of blockquote marker (`> `) from a signal body line. */
const QUOTE_PREFIX_RE = /^\s*>\s?/;

/**
 * `> [!NOTE]` and the quoted lines under it, as its own block token. Tokenizing
 * the signal (rather than special-casing it in the blockquote renderer) keeps the
 * body a normal token tree, so it renders through the same parser as everything
 * else.
 */
const signalToken: TokenizerAndRendererExtension = {
	name: 'signal',
	level: 'block',
	start: (src: string) => src.search(/^\s*>\s*\[!/m),
	tokenizer(src: string) {
		const lines = src.split('\n');
		const type = signalType(lines[0]);
		if (!type) return;

		let end = 1;
		while (end < lines.length && QUOTE_PREFIX_RE.test(lines[end])) end++;
		const body = lines
			.slice(1, end)
			.map((line) => line.replace(QUOTE_PREFIX_RE, ''))
			.join('\n');

		return {
			type: 'signal',
			raw: lines.slice(0, end).join('\n'),
			signal: type,
			tokens: this.lexer.blockTokens(body, [])
		};
	},
	renderer(token: Tokens.Generic) {
		const body = this.parser.parse(token.tokens ?? []);
		return (
			`<div class="ex-signal ex-signal-${token.signal}">` +
			`<div class="ex-signal-header" data-signal="${token.signal}"></div>` +
			`<div class="ex-signal-body">${body}</div>` +
			`</div>\n`
		);
	}
};

const exportExtensions: MarkedExtension = { extensions: [tagToken, signalToken] };

const renderer = new Renderer();

// `![…](url)` is the single embed syntax: a local path or an image URL is a
// picture, anything else is the link card (see `isImageUrl` in embeds.config).
// Both need work the renderer cannot do — reading desk bytes, fetching metadata —
// so both are placeholders.
renderer.image = ({ href, text }: Tokens.Image) => {
	if (!href) return '';
	const label = attr(text ?? '');
	if (isImageUrl(href)) {
		return `<img class="ex-image" data-src="${attr(href)}" alt="${label}" />`;
	}
	return `<span class="ex-embed" data-url="${attr(href)}" data-label="${label}"></span>`;
};

// Heading levels below 4 reuse the h4 metrics, as the editor's theme does.
renderer.heading = function ({ tokens, depth }: Tokens.Heading) {
	const level = Math.min(depth, 4);
	return `<h${depth} class="ex-h ex-h${level}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
};

renderer.checkbox = ({ checked }: Tokens.Checkbox) =>
	`<span class="ex-checkbox" data-checked="${checked}"></span>`;

// A task item carries its own checkbox, so it drops the list marker.
renderer.listitem = function (item: Tokens.ListItem) {
	const cls = item.task ? ' class="ex-task"' : '';
	return `<li${cls}>${this.parser.parse(item.tokens)}</li>\n`;
};

// The language badge the editor prints on a fence's first line.
renderer.code = function ({ text, lang, escaped }: Tokens.Code) {
	const language = (lang ?? '').match(/^\S*/)?.[0] ?? '';
	const badge = language ? ` data-lang="${attr(language)}"` : '';
	const body = escaped
		? text
		: text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return `<pre class="ex-code"${badge}><code>${body}</code></pre>\n`;
};

// An isolated instance: these extensions describe the export page only, and the
// shared `marked` singleton also renders the sidebar preview.
const exportMarked = new Marked({ renderer, breaks: true, async: false });
exportMarked.use(highlightExtension, exportExtensions);

/** Render note markdown as the HTML the export page rasterises. */
export function renderExportHtml(content: string): string {
	return exportMarked.parse(content) as string;
}
