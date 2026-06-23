import { describe, it, expect } from 'vitest';
import { resolveBinding, toAccelerator } from './shortcut';

describe('resolveBinding', () => {
	it('returns the custom binding when one is set for the id', () => {
		expect(resolveBinding({ 'new-note': '$mod+Shift+n' }, 'new-note', '$mod+n')).toBe(
			'$mod+Shift+n'
		);
	});

	it('falls back to the default binding when no custom override exists', () => {
		expect(resolveBinding({}, 'new-note', '$mod+n')).toBe('$mod+n');
		expect(resolveBinding({ 'other-id': 'x' }, 'new-note', '$mod+n')).toBe('$mod+n');
	});
});

describe('toAccelerator', () => {
	it('rewrites $mod to CommandOrControl', () => {
		expect(toAccelerator('$mod+k')).toBe('CommandOrControl+k');
	});

	it('rewrites Meta to Super', () => {
		expect(toAccelerator('Meta+Space')).toBe('Super+Space');
	});

	it('leaves other tokens untouched and preserves order', () => {
		expect(toAccelerator('$mod+Shift+Space')).toBe('CommandOrControl+Shift+Space');
		expect(toAccelerator('Alt+ArrowUp')).toBe('Alt+ArrowUp');
	});
});
