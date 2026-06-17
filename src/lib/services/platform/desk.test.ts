import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	BaseDirectory: { Document: 3, AppData: 4 },
	exists: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn()
}));
vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));
vi.mock('$lib/utils/db', () => ({ closeDBIfMatches: vi.fn(), loadDB: vi.fn() }));

import { sanitizeDeskName } from './desk';

describe('sanitizeDeskName', () => {
	it('returns a clean name unchanged', () => {
		expect(sanitizeDeskName('Work')).toBe('Work');
	});

	it('trims leading and trailing whitespace', () => {
		expect(sanitizeDeskName('  Work  ')).toBe('Work');
	});

	it('replaces backslash', () => {
		expect(sanitizeDeskName('My\\Desk')).toBe('My-Desk');
	});

	it('replaces forward slash', () => {
		expect(sanitizeDeskName('My/Desk')).toBe('My-Desk');
	});

	it('replaces colon', () => {
		expect(sanitizeDeskName('Desk:2025')).toBe('Desk-2025');
	});

	it('replaces asterisk', () => {
		expect(sanitizeDeskName('Desk*Name')).toBe('Desk-Name');
	});

	it('replaces question mark', () => {
		expect(sanitizeDeskName('Desk?Name')).toBe('Desk-Name');
	});

	it('replaces double quote', () => {
		expect(sanitizeDeskName('Desk"Name')).toBe('Desk-Name');
	});

	it('replaces less-than sign', () => {
		expect(sanitizeDeskName('Desk<Name')).toBe('Desk-Name');
	});

	it('replaces greater-than sign', () => {
		expect(sanitizeDeskName('Desk>Name')).toBe('Desk-Name');
	});

	it('replaces pipe', () => {
		expect(sanitizeDeskName('Desk|Name')).toBe('Desk-Name');
	});

	it('replaces multiple illegal chars in sequence', () => {
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
