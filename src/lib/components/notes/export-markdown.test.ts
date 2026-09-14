import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { renderExportHtml } from './export-markdown';

describe('renderExportHtml', () => {
	it('renders an image reference as a placeholder the hydration resolves', () => {
		const html = renderExportHtml('![a cat](attachments/cat.png)');
		expect(html).toContain('class="ex-image" data-src="attachments/cat.png" alt="a cat"');
	});

	it('renders a non-image URL as a link card placeholder, as the editor does', () => {
		const html = renderExportHtml('![Tarifs](https://www.louvre.fr/visiter/horaires-tarifs)');
		expect(html).toContain(
			'class="ex-embed" data-url="https://www.louvre.fr/visiter/horaires-tarifs" data-label="Tarifs"'
		);
	});

	it('keeps list markers, which Tailwind preflight would otherwise strip', () => {
		expect(renderExportHtml('- one\n- two')).toContain('<li>one</li>');
	});

	it('marks a task item so it drops its list marker, and places a checkbox', () => {
		const html = renderExportHtml('- [x] done\n- [ ] todo');
		expect(html).toContain('<li class="ex-task">');
		expect(html).toContain('class="ex-checkbox" data-checked="true"');
		expect(html).toContain('class="ex-checkbox" data-checked="false"');
	});

	it('turns a signal blockquote into its own block, marker line consumed', () => {
		const html = renderExportHtml('> [!WARNING]\n> mind the gap');
		expect(html).toContain('class="ex-signal ex-signal-warning"');
		expect(html).toContain('data-signal="warning"');
		expect(html).toContain('mind the gap');
		expect(html).not.toContain('[!WARNING]');
	});

	it('leaves a plain blockquote alone', () => {
		expect(renderExportHtml('> just a quote')).toContain('<blockquote>');
	});

	it('renders a hashtag as a chip placeholder', () => {
		expect(renderExportHtml('see #travel here')).toContain('class="ex-tag" data-tag="travel"');
	});

	it('does not mistake a color span for a hashtag', () => {
		const html = renderExportHtml('<span style="color: #fff">white</span>');
		expect(html).not.toContain('ex-tag');
	});

	it('tags a fenced block with its language for the editor badge', () => {
		const html = renderExportHtml('```ts\nconst a = 1;\n```');
		expect(html).toContain('<pre class="ex-code" data-lang="ts">');
	});

	it('escapes quotes in an embed label so the attribute cannot break out', () => {
		const html = renderExportHtml('![say "hi"](https://example.com/page)');
		expect(html).toContain('data-label="say &quot;hi&quot;"');
	});

	it('leaves the shared marked singleton untouched', () => {
		renderExportHtml('see #travel');
		expect(marked('see #travel') as string).not.toContain('ex-tag');
	});
});
