import type { BlockContext, Element, Line, MarkdownConfig } from '@lezer/markdown';

const HASH = 35; // '#'
const SPACE = 32;

function isSpace(ch: number): boolean {
	return ch === SPACE || ch === 9 || ch === 10 || ch === 13;
}

function skipSpaceBack(text: string, i: number, to: number): number {
	while (i > to && isSpace(text.charCodeAt(i - 1))) i--;
	return i;
}

// Like Lezer's isAtxHeading, but the marks MUST be followed by a real space.
// The built-in parser also accepts `#` at end-of-line, which makes the title
// style appear before the user types a space — that case returns -1 here.
function headingSize(line: Line): number {
	if (line.next !== HASH) return -1;
	let pos = line.pos + 1;
	while (pos < line.text.length && line.text.charCodeAt(pos) === HASH) pos++;
	if (pos >= line.text.length || line.text.charCodeAt(pos) !== SPACE) return -1;
	const size = pos - line.pos;
	return size > 6 ? -1 : size;
}

// Replaces the default `ATXHeading` block parser (same name => override).
// Faithful port of the original, only the space requirement differs; when a
// line is not a heading it returns false and falls back to paragraph parsing.
export const spaceRequiredHeadings: MarkdownConfig = {
	parseBlock: [
		{
			name: 'ATXHeading',
			parse(cx: BlockContext, line: Line): boolean {
				const size = headingSize(line);
				if (size < 0) return false;

				const off = line.pos;
				const from = cx.lineStart + off;
				const endOfSpace = skipSpaceBack(line.text, line.text.length, off);
				let after = endOfSpace;
				while (after > off && line.text.charCodeAt(after - 1) === HASH) after--;
				if (after === endOfSpace || after === off || !isSpace(line.text.charCodeAt(after - 1)))
					after = line.text.length;

				const children: Element[] = [cx.elt('HeaderMark', from, from + size)];
				children.push(...cx.parser.parseInline(line.text.slice(off + size + 1, after), from + size + 1));
				if (after < line.text.length)
					children.push(cx.elt('HeaderMark', cx.lineStart + after, cx.lineStart + endOfSpace));

				cx.addElement(cx.elt(`ATXHeading${size}`, from, cx.lineStart + line.text.length, children));
				cx.nextLine();
				return true;
			}
		}
	]
};
