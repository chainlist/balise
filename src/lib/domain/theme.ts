// Theme domain: the pure theme rules and the user-picked primary-color CSS-var
// computation. No I/O, no Svelte, no Tauri, no DOM. The `system` resolution takes
// the OS dark-mode preference as a boolean argument (the `matchMedia` read is the
// theme service's side effect); the primary-color helpers return plain CSS-var
// maps the appearance service writes to `document`.

export const THEMES = {
	LIGHT: 'light',
	DARK: 'dark',
	SYSTEM: 'system'
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

/** Resolve the effective light/dark theme. `system` follows the OS preference
 *  (passed in as a boolean), every other theme is itself. */
export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
	if (theme !== THEMES.SYSTEM) return theme;
	return prefersDark ? 'dark' : 'light';
}

/* CSS custom properties for a user-picked primary color.

   Solid fills honor the pick as-is: --primary-500 (which the Tailwind `primary`
   utilities, buttons and the picker swatch resolve to) is the exact picked color,
   and the rest of the 50→950 scale are tints/shades of it, so what you pick is
   what you see.

   --primary (M3) is used as a *foreground* (links, editor markup, focus ring) on
   the surface, so it must stay legible: --primary-custom (light) caps lightness so
   a light pick doesn't vanish on the light surface, and --primary-custom-dark
   raises it so the pick stays readable on the dark surface.

   --on-primary-* is the text drawn on top of a primary fill, flipped to black or
   white for contrast. */

/* 50→950 as the picked color mixed toward white (tints) then black (shades).
   500 is omitted: it is the picked color itself. */
const SCALE_MIX: Record<string, string> = {
	'--primary-50': 'white 92%',
	'--primary-100': 'white 84%',
	'--primary-200': 'white 68%',
	'--primary-300': 'white 50%',
	'--primary-400': 'white 28%',
	'--primary-600': 'black 16%',
	'--primary-700': 'black 34%',
	'--primary-800': 'black 50%',
	'--primary-900': 'black 64%',
	'--primary-950': 'black 74%'
};

export const PRIMARY_COLOR_VARS = [
	'--primary-500',
	...Object.keys(SCALE_MIX),
	'--primary-custom',
	'--primary-custom-dark',
	'--on-primary-custom',
	'--on-primary-custom-dark'
];

/** True when `hex` is light enough that white text on it would be hard to read. */
function isLight(hex: string): boolean {
	const n = hex.replace('#', '');
	const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const r = toLinear(parseInt(n.slice(0, 2), 16) / 255);
	const g = toLinear(parseInt(n.slice(2, 4), 16) / 255);
	const b = toLinear(parseInt(n.slice(4, 6), 16) / 255);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4;
}

export function primaryColorVars(color: string): Record<string, string> {
	return {
		'--primary-500': color,
		...Object.fromEntries(
			Object.entries(SCALE_MIX).map(([name, mix]) => [
				name,
				`color-mix(in oklab, ${color}, ${mix})`
			])
		),
		'--primary-custom': `oklch(from ${color} min(l, 0.5) c h)`,
		'--primary-custom-dark': `oklch(from ${color} max(l, 0.78) c h)`,
		'--on-primary-custom': isLight(color) ? 'oklch(0.22 0.02 280)' : 'oklch(1 0 0)',
		'--on-primary-custom-dark': `oklch(from ${color} 0.25 c h)`
	};
}
