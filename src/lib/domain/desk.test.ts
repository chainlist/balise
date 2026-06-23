import { describe, it, expect } from 'vitest';
import { sanitizeDeskName, canRemoveDesk, isAppDataFolder } from './desk';

describe('sanitizeDeskName', () => {
	it('returns a clean name unchanged', () => {
		expect(sanitizeDeskName('Work')).toBe('Work');
	});

	it('trims leading and trailing whitespace', () => {
		expect(sanitizeDeskName('  Work  ')).toBe('Work');
	});

	it('replaces every illegal path character with a dash', () => {
		expect(sanitizeDeskName('a\\b/c:d*e?f"g<h>i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
	});

	it('preserves spaces within the name', () => {
		expect(sanitizeDeskName('My Notes 2025')).toBe('My Notes 2025');
	});

	it('throws when the name is empty', () => {
		expect(() => sanitizeDeskName('')).toThrow('Desk name cannot be empty.');
	});

	it('throws when the name is only whitespace', () => {
		expect(() => sanitizeDeskName('   ')).toThrow('Desk name cannot be empty.');
	});
});

describe('canRemoveDesk', () => {
	it('is false when only one desk remains', () => {
		expect(canRemoveDesk(['Personal'])).toBe(false);
	});

	it('is false for an empty list', () => {
		expect(canRemoveDesk([])).toBe(false);
	});

	it('is true when more than one desk exists', () => {
		expect(canRemoveDesk(['Personal', 'Work'])).toBe(true);
	});
});

describe('isAppDataFolder', () => {
	it('is true for a dot-prefixed folder', () => {
		expect(isAppDataFolder('.balise')).toBe(true);
	});

	it('is false for a normal desk folder', () => {
		expect(isAppDataFolder('Personal')).toBe(false);
	});
});
