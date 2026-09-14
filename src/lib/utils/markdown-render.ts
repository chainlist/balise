import type { MarkedExtension, TokenizerAndRendererExtension, Tokens } from 'marked';
import { HIGHLIGHT_SOURCE } from '$lib/utils/markdown-patterns';

// The `=text=` highlight is a Balise extension, not CommonMark, so `marked` has to
// be taught it. Shared by every surface that renders note markdown (the sidebar
// preview and the export view) so a highlight looks the same in all of them.

const HIGHLIGHT_TOKEN_RE = new RegExp(`^${HIGHLIGHT_SOURCE}`);

const highlightToken: TokenizerAndRendererExtension = {
	name: 'highlight',
	level: 'inline',
	start: (src: string) => src.indexOf('='),
	tokenizer(src: string) {
		const match = HIGHLIGHT_TOKEN_RE.exec(src);
		if (match) return { type: 'highlight', raw: match[0], text: match[1] };
	},
	renderer(token: Tokens.Generic) {
		return `<mark>${token.text}</mark>`;
	}
};

export const highlightExtension: MarkedExtension = { extensions: [highlightToken] };
