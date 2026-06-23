import { describe, it, expect } from 'vitest';
import { resolveTheme, primaryColorVars, PRIMARY_COLOR_VARS } from './theme';

describe('resolveTheme', () => {
	it('returns the explicit theme unchanged', () => {
		expect(resolveTheme('light', true)).toBe('light');
		expect(resolveTheme('light', false)).toBe('light');
		expect(resolveTheme('dark', true)).toBe('dark');
		expect(resolveTheme('dark', false)).toBe('dark');
	});

	it('follows the OS preference when the theme is system', () => {
		expect(resolveTheme('system', true)).toBe('dark');
		expect(resolveTheme('system', false)).toBe('light');
	});
});

describe('primaryColorVars', () => {
	it('sets --primary-500 to the exact picked color', () => {
		expect(primaryColorVars('#7c6cde')['--primary-500']).toBe('#7c6cde');
	});

	it('emits every variable listed in PRIMARY_COLOR_VARS', () => {
		const vars = primaryColorVars('#7c6cde');
		for (const name of PRIMARY_COLOR_VARS) {
			expect(vars[name]).toBeDefined();
		}
	});

	it('flips the on-primary text to dark for a light pick and white for a dark pick', () => {
		expect(primaryColorVars('#ffffff')['--on-primary-custom']).toBe('oklch(0.22 0.02 280)');
		expect(primaryColorVars('#000000')['--on-primary-custom']).toBe('oklch(1 0 0)');
	});
});
