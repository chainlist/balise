import { describe, it, expect } from 'vitest';
import { EXPORT_FORMATS, exportExtension, exportFileName, buildSinglePagePdf } from './export';

// ─── exportExtension ──────────────────────────────────────────────────────────

describe('exportExtension', () => {
	it('maps jpeg to the .jpg spelling', () => {
		expect(exportExtension(EXPORT_FORMATS.JPEG)).toBe('jpg');
	});

	it('maps pdf and png to themselves', () => {
		expect(exportExtension(EXPORT_FORMATS.PDF)).toBe('pdf');
		expect(exportExtension(EXPORT_FORMATS.PNG)).toBe('png');
	});
});

// ─── exportFileName ───────────────────────────────────────────────────────────

describe('exportFileName', () => {
	const png = EXPORT_FORMATS.PNG;

	it('uses the title with the format extension', () => {
		expect(exportFileName('Quarterly review', png, 'Untitled')).toBe('Quarterly review.png');
	});

	it('strips path-illegal characters', () => {
		expect(exportFileName('a/b\\c:d*e?f"g<h>i|j', png, 'Untitled')).toBe('a b c d e f g h i j.png');
	});

	it('keeps hyphens and inner punctuation', () => {
		expect(exportFileName('Q3 - notes (draft), v2', png, 'Untitled')).toBe(
			'Q3 - notes (draft), v2.png'
		);
	});

	it('collapses runs of whitespace', () => {
		expect(exportFileName('too   many\t\tspaces', png, 'Untitled')).toBe('too many spaces.png');
	});

	it('falls back when the title is empty or only illegal characters', () => {
		expect(exportFileName('', png, 'Untitled')).toBe('Untitled.png');
		expect(exportFileName('   ', png, 'Untitled')).toBe('Untitled.png');
		expect(exportFileName('///', png, 'Untitled')).toBe('Untitled.png');
	});

	it('falls back on a Windows reserved stem', () => {
		expect(exportFileName('CON', png, 'Untitled')).toBe('Untitled.png');
		expect(exportFileName('lpt1', png, 'Untitled')).toBe('Untitled.png');
		expect(exportFileName('console', png, 'Untitled')).toBe('console.png');
	});

	it('drops trailing dots and spaces Windows would silently strip', () => {
		expect(exportFileName('report...', png, 'Untitled')).toBe('report.png');
	});

	it('truncates a very long title', () => {
		const name = exportFileName('x'.repeat(200), png, 'Untitled');
		expect(name).toBe(`${'x'.repeat(80)}.png`);
	});

	it('uses the caller-supplied localized fallback', () => {
		expect(exportFileName('', png, 'Sans titre')).toBe('Sans titre.png');
	});
});

// ─── buildSinglePagePdf ───────────────────────────────────────────────────────

/** A stand-in for encoded JPEG bytes, including a byte that must survive
 *  verbatim through the stream and a 0x0a that naive line handling would break. */
const FAKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x0a, 0x7f, 0x80, 0xff, 0xd9]);

function ascii(pdf: Uint8Array): string {
	return Array.from(pdf, (b) => String.fromCharCode(b)).join('');
}

describe('buildSinglePagePdf', () => {
	it('emits a PDF header and EOF marker', () => {
		const text = ascii(buildSinglePagePdf(FAKE_JPEG, 800, 600));
		expect(text.startsWith('%PDF-1.4\n')).toBe(true);
		expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
	});

	it('embeds the JPEG bytes verbatim', () => {
		const pdf = buildSinglePagePdf(FAKE_JPEG, 800, 600);
		const at = ascii(pdf).indexOf('stream\n', ascii(pdf).indexOf('/DCTDecode')) + 'stream\n'.length;
		expect(Array.from(pdf.slice(at, at + FAKE_JPEG.length))).toEqual(Array.from(FAKE_JPEG));
	});

	it('declares the JPEG stream length as the real byte count', () => {
		const text = ascii(buildSinglePagePdf(FAKE_JPEG, 800, 600));
		expect(text).toContain(`/Length ${FAKE_JPEG.length} >>`);
	});

	it('writes xref offsets that land exactly on each object header', () => {
		const pdf = buildSinglePagePdf(FAKE_JPEG, 800, 600);
		const text = ascii(pdf);

		// Anchor on the newline: a bare 'xref' also occurs inside 'startxref'.
		const xrefAt = text.lastIndexOf('\nxref\n') + 1;
		const entries = text
			.slice(text.indexOf('\n', xrefAt + 5) + 1)
			.split('\n')
			.slice(0, 6);

		// Object 0 is the free head of the chain.
		expect(entries[0]).toBe('0000000000 65535 f ');

		for (let id = 1; id <= 5; id++) {
			const offset = Number(entries[id].slice(0, 10));
			expect(text.startsWith(`${id} 0 obj\n`, offset)).toBe(true);
		}
	});

	it('points startxref at the xref table', () => {
		const text = ascii(buildSinglePagePdf(FAKE_JPEG, 800, 600));
		const declared = Number(text.slice(text.lastIndexOf('startxref\n') + 10).split('\n')[0]);
		expect(text.startsWith('xref\n', declared)).toBe(true);
	});

	it('gives every xref entry the mandatory 20-byte width', () => {
		const text = ascii(buildSinglePagePdf(FAKE_JPEG, 800, 600));
		const xrefAt = text.lastIndexOf('\nxref\n') + 1;
		const start = text.indexOf('\n', xrefAt + 5) + 1;
		for (let id = 0; id < 6; id++) {
			expect(text.slice(start + id * 20, start + (id + 1) * 20)).toHaveLength(20);
		}
		expect(text.startsWith('trailer', start + 6 * 20)).toBe(true);
	});

	it('keeps the image aspect ratio on an A4-wide page', () => {
		const text = ascii(buildSinglePagePdf(FAKE_JPEG, 1000, 500));
		// 595.28 wide, half as tall for a 2:1 image.
		expect(text).toContain('/MediaBox [0 0 595.28 297.64]');
	});

	it('records the pixel dimensions on the image object', () => {
		const text = ascii(buildSinglePagePdf(FAKE_JPEG, 1234, 567));
		expect(text).toContain('/Width 1234 /Height 567');
	});

	it('refuses a degenerate image rather than emitting a broken page', () => {
		expect(() => buildSinglePagePdf(FAKE_JPEG, 0, 600)).toThrow();
		expect(() => buildSinglePagePdf(FAKE_JPEG, 800, 0)).toThrow();
	});
});
