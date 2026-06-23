import { describe, it, expect } from 'vitest';
import {
	migrateLegacySettings,
	LEGACY_SETTING_KEYS,
	clampFontSize,
	clampLineHeight,
	normalizeLanguage,
	normalizeMagicRules,
	MAGIC_TAG_MATCH_TYPES,
	type LegacySettings
} from './settings';

describe('migrateLegacySettings', () => {
	it('maps a full set of flat keys into grouped sections and the delete list', () => {
		const raw: LegacySettings = {
			theme: 'dark',
			fontSize: 18,
			lineHeight: 1.6,
			markdownMarks: 'always',
			customBindings: { save: 'mod+s' },
			language: 'fr',
			magicTags: [{ tag: 'todo', pattern: '- [ ]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH }],
			closeToTray: true,
			meshColors: ['#111', '#222', '#333', '#444'],
			meshSizes: [1, 2, 3, 4],
			meshMode: 'unified',
			meshUnifiedColor: '#abc',
			meshEnabled: false,
			primaryColor: '#0f0'
		};

		const result = migrateLegacySettings(raw);

		expect(result).not.toBeNull();
		expect(result!.sections).toEqual({
			general: { language: 'fr', closeToTray: true },
			appearance: {
				theme: 'dark',
				primaryColor: '#0f0',
				meshColors: ['#111', '#222', '#333', '#444'],
				meshSizes: [1, 2, 3, 4],
				meshMode: 'unified',
				meshUnifiedColor: '#abc',
				meshEnabled: false
			},
			editor: { fontSize: 18, lineHeight: 1.6, markdownMarks: 'always' },
			magicTags: {
				tags: [{ tag: 'todo', pattern: '- [ ]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH }]
			},
			shortcuts: { customBindings: { save: 'mod+s' } }
		});
		expect(result!.deleteKeys).toEqual([...LEGACY_SETTING_KEYS]);
	});

	it('omits undefined legacy values so defaults are preserved on load', () => {
		const result = migrateLegacySettings({ theme: 'light' });

		expect(result).not.toBeNull();
		expect(result!.sections).toEqual({
			general: {},
			appearance: { theme: 'light' },
			editor: {},
			magicTags: {},
			shortcuts: {}
		});
		// false/null are real, kept values; only `undefined` is dropped.
		const withFalsey = migrateLegacySettings({ meshEnabled: false, closeToTray: null });
		expect(withFalsey!.sections.appearance).toEqual({ meshEnabled: false });
		expect(withFalsey!.sections.general).toEqual({ closeToTray: null });
	});

	it('returns null when no legacy key is present (fresh install / already migrated)', () => {
		expect(migrateLegacySettings({})).toBeNull();
		expect(migrateLegacySettings({ theme: undefined, fontSize: undefined })).toBeNull();
	});
});

describe('clampFontSize', () => {
	it('clamps below the minimum and above the maximum', () => {
		expect(clampFontSize(5)).toBe(12);
		expect(clampFontSize(100)).toBe(42);
	});

	it('rounds to a whole px within range', () => {
		expect(clampFontSize(16.4)).toBe(16);
		expect(clampFontSize(16.6)).toBe(17);
	});
});

describe('clampLineHeight', () => {
	it('clamps below the minimum and above the maximum', () => {
		expect(clampLineHeight(0.5)).toBe(1.2);
		expect(clampLineHeight(9)).toBe(2.5);
	});

	it('snaps to the 0.05 step within range', () => {
		expect(clampLineHeight(1.73)).toBe(1.75);
		expect(clampLineHeight(1.71)).toBe(1.7);
	});
});

describe('normalizeLanguage', () => {
	it('passes a supported language through', () => {
		expect(normalizeLanguage('de')).toBe('de');
	});

	it('falls back to en for an unknown language', () => {
		expect(normalizeLanguage('jp')).toBe('en');
		expect(normalizeLanguage('')).toBe('en');
	});
});

describe('normalizeMagicRules', () => {
	it('defaults a missing matchType to contains', () => {
		expect(normalizeMagicRules([{ tag: 'idea', pattern: 'idea:' }])).toEqual([
			{ tag: 'idea', pattern: 'idea:', matchType: MAGIC_TAG_MATCH_TYPES.CONTAINS }
		]);
	});

	it('preserves an existing matchType', () => {
		expect(
			normalizeMagicRules([
				{ tag: 'todo', pattern: '- [ ]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH }
			])
		).toEqual([{ tag: 'todo', pattern: '- [ ]', matchType: MAGIC_TAG_MATCH_TYPES.STARTS_WITH }]);
	});
});
