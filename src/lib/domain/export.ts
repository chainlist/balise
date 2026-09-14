// Export domain: the formats a note can be exported to, the filename rule, and
// the single-page PDF wrapper around a rasterised note. Pure — no DOM, no I/O,
// no Tauri. The service rasterises and writes; everything decidable without a
// canvas is decided here.

export const EXPORT_FORMATS = {
	PDF: 'pdf',
	PNG: 'png',
	JPEG: 'jpeg'
} as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[keyof typeof EXPORT_FORMATS];

/** File extension per format — `jpeg` is written `.jpg`, the spelling every OS
 *  file picker suggests. */
const EXTENSIONS: Record<ExportFormat, string> = {
	pdf: 'pdf',
	png: 'png',
	jpeg: 'jpg'
};

export function exportExtension(format: ExportFormat): string {
	return EXTENSIONS[format];
}

// ─── Filename ─────────────────────────────────────────────────────────────────

/** Characters no Windows path may contain, plus control codes. The superset of
 *  what macOS (`/`, `:`) and Linux (`/`) reject, so one rule covers all three. */
// The control range is deliberate: those bytes are illegal in a filename and a
// title could carry one.
// eslint-disable-next-line no-control-regex
const ILLEGAL_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/** Windows refuses these stems whatever the extension. */
const RESERVED_STEMS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Long titles make unwieldy filenames and can breach path limits once joined to
 *  a deep directory. */
const MAX_STEM = 80;

/**
 * Suggested filename for an exported note: the title with path-illegal
 * characters stripped, collapsed whitespace, and the format's extension.
 * `fallback` (a localized "Untitled") stands in when the title is empty or
 * sanitises away to nothing, so the dialog is never offered a bare extension.
 */
export function exportFileName(title: string, format: ExportFormat, fallback: string): string {
	let stem = title
		.replace(ILLEGAL_CHARS, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_STEM)
		// Trailing dots and spaces are silently dropped by Windows, which would
		// desync the name the user picked from the file that appears on disk.
		.replace(/[. ]+$/, '');

	if (!stem || RESERVED_STEMS.test(stem)) stem = fallback;
	return `${stem}.${exportExtension(format)}`;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/** A4 portrait width in PostScript points. The page keeps the note's aspect
 *  ratio, so only the width is fixed. */
const A4_WIDTH_PT = 595.28;

/** Number of PDF objects the document below emits, plus the free object 0. */
const OBJECT_COUNT = 5;

/**
 * Wrap a rasterised note in a one-page PDF.
 *
 * The JPEG is embedded verbatim as a `DCTDecode` image XObject — PDF reads JPEG
 * natively, so the bytes pass straight through with no re-encoding and no
 * compression library. The page is A4 wide and as tall as the image's aspect
 * ratio demands, which means a long note yields one tall page rather than a
 * paginated document; that is the accepted tradeoff of the raster approach.
 */
export function buildSinglePagePdf(
	jpeg: Uint8Array,
	pixelWidth: number,
	pixelHeight: number
): Uint8Array {
	if (pixelWidth <= 0 || pixelHeight <= 0) {
		throw new Error(`refusing to build a PDF from a ${pixelWidth}x${pixelHeight} image`);
	}

	const pageWidth = A4_WIDTH_PT;
	const pageHeight = (pixelHeight / pixelWidth) * pageWidth;
	const pt = (n: number) => n.toFixed(2);

	// The image fills the page: scale the unit square to the page box, then draw.
	const content = `q ${pt(pageWidth)} 0 0 ${pt(pageHeight)} 0 0 cm /Im0 Do Q\n`;

	const encoder = new TextEncoder();
	const chunks: Uint8Array[] = [];
	const offsets: number[] = [];
	let cursor = 0;

	function put(data: string | Uint8Array): void {
		const bytes = typeof data === 'string' ? encoder.encode(data) : data;
		chunks.push(bytes);
		cursor += bytes.length;
	}

	function beginObject(id: number): void {
		offsets[id] = cursor;
		put(`${id} 0 obj\n`);
	}

	function endObject(): void {
		put('endobj\n');
	}

	put('%PDF-1.4\n');
	// A comment of bytes > 127 marks the file binary, so transfer tools do not
	// mangle the JPEG's line endings.
	put(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

	beginObject(1);
	put('<< /Type /Catalog /Pages 2 0 R >>\n');
	endObject();

	beginObject(2);
	put('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
	endObject();

	beginObject(3);
	put(
		`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(pageWidth)} ${pt(pageHeight)}] ` +
			`/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n`
	);
	endObject();

	beginObject(4);
	put(
		`<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
			`/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
			`/Length ${jpeg.length} >>\nstream\n`
	);
	put(jpeg);
	put('\nendstream\n');
	endObject();

	const contentBytes = encoder.encode(content);
	beginObject(5);
	put(`<< /Length ${contentBytes.length} >>\nstream\n`);
	put(contentBytes);
	put('endstream\n');
	endObject();

	// Cross-reference table: every entry is exactly 20 bytes, object 0 free.
	const xrefOffset = cursor;
	put(`xref\n0 ${OBJECT_COUNT + 1}\n`);
	put('0000000000 65535 f \n');
	for (let id = 1; id <= OBJECT_COUNT; id++) {
		put(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
	}
	put(`trailer\n<< /Size ${OBJECT_COUNT + 1} /Root 1 0 R >>\n`);
	put(`startxref\n${xrefOffset}\n%%EOF\n`);

	const pdf = new Uint8Array(cursor);
	let at = 0;
	for (const chunk of chunks) {
		pdf.set(chunk, at);
		at += chunk.length;
	}
	return pdf;
}
