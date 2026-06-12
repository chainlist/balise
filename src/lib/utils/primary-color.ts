/* Lightness/chroma per primary slot, copied from the default theme in layout.css.
   A custom primary keeps each slot's lightness and chroma and only adopts the
   picked color's hue, so light/dark contrast stays identical to the default theme. */
const PRIMARY_SLOTS: Record<string, [lightness: number, chroma: number]> = {
	/* Static primary scale (same in light and dark) */
	'--primary-50': [0.966, 0.008],
	'--primary-100': [0.924, 0.015],
	'--primary-200': [0.856, 0.03],
	'--primary-300': [0.784, 0.047],
	'--primary-400': [0.697, 0.066],
	'--primary-500': [0.603, 0.085],
	'--primary-600': [0.517, 0.071],
	'--primary-700': [0.42, 0.058],
	'--primary-800': [0.323, 0.046],
	'--primary-900': [0.236, 0.035],
	'--primary-950': [0.18, 0.025],
	/* M3 vars that differ per mode (light --on-primary stays white, no override) */
	'--primary-custom': [0.31114, 0.1735],
	'--primary-custom-dark': [0.8312, 0.0848],
	'--on-primary-custom-dark': [0.2354, 0.1326]
};

export const PRIMARY_COLOR_VARS = Object.keys(PRIMARY_SLOTS);

export function primaryColorVars(color: string): Record<string, string> {
	return Object.fromEntries(
		Object.entries(PRIMARY_SLOTS).map(([name, [l, c]]) => [
			name,
			`oklch(from ${color} ${l} ${c} h)`
		])
	);
}
