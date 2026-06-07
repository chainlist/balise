import type { Tag } from '$lib/models/tag';

export const DEFAULT_TAG_COLOR = '#7F77DD';

const PALETTE_LIGHT = [
	'#7F77DD',
	'#1D9E75',
	'#D85A30',
	'#378ADD',
	'#9333EA',
	'#E0A30E',
	'#D6336C',
	'#0CA678'
];

const PALETTE_DARK = [
	'#AFA9EC',
	'#5DCAA5',
	'#F0997B',
	'#85B7EB',
	'#C084FC',
	'#F5CF5B',
	'#F06595',
	'#38D9A9'
];

export function assignGraphColors(tags: Tag[], isDark: boolean): Record<string, string> {
	const palette = isDark ? PALETTE_DARK : PALETTE_LIGHT;
	const map: Record<string, string> = {};
	tags.forEach((t, i) => {
		map[t.tag.toLowerCase()] =
			t.color && t.color.toUpperCase() !== DEFAULT_TAG_COLOR.toUpperCase()
				? t.color
				: palette[i % palette.length];
	});
	return map;
}
