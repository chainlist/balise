import { describe, it, expect, vi, beforeEach } from 'vitest';

// The service reaches the settings store and the notes service, both of which
// reach Tauri. Stub them so the sequencing itself (render -> create -> the
// cursor claim the editor picks up) can be exercised in node.
const settings = {
	noteTemplates: { state: { templates: [], defaultTemplateId: null as string | null } },
	general: { state: { dateFormat: 'iso', language: 'en' } }
};
const created: string[] = [];
// The real `uiState.activeNoteId` falls back to the newest note, so the editor
// mounts (and asks for the cursor claim) the instant the note joins the list,
// before `create` returns. This stands in for that early read.
let claimDuringCreate: number | null = null;
let earlyRead: ((id: string) => number | null) | null = null;

vi.mock('$lib/services/settings/settings.svelte', () => ({
	get settingsService() {
		return settings;
	}
}));
vi.mock('$lib/services/notes.svelte', () => ({
	notesService: {
		create: async (content: string, id?: string) => {
			created.push(content);
			const noteId = id ?? `minted-${created.length}`;
			// The note joins the list here; the editor opens off that.
			claimDuringCreate = earlyRead?.(noteId) ?? null;
			return noteId;
		}
	}
}));

const { templatesService } = await import('./templates');

beforeEach(() => {
	created.length = 0;
	claimDuringCreate = null;
	earlyRead = null;
});

describe('templatesService cursor claim', () => {
	it('lands the caret where {{cursor}} was, and only for that note', async () => {
		const template = { id: 't1', name: 'Meeting', body: '## {{title}}\n\n{{cursor}}\n\n- [ ] ' };

		const id = await templatesService.create(null, template);

		expect(created[0]).toBe('## New Note\n\n\n\n- [ ] \n\n');
		expect(templatesService.takeCursor('some-other-note')).toBeNull();
		expect(templatesService.takeCursor(id)).toBe(13);
		// The claim is consumed, so a later editor never reuses it.
		expect(templatesService.takeCursor(id)).toBeNull();
	});

	it('has the claim staked before the note reaches the list', async () => {
		earlyRead = (id) => templatesService.takeCursor(id);

		await templatesService.create(null, { id: 't1', name: 'M', body: '# {{title}} {{cursor}}' });

		expect(claimDuringCreate).toBe(11);
	});

	it('leaves no claim for a template without the marker', async () => {
		const id = await templatesService.create(null, { id: 't2', name: 'Plain', body: '### Hi' });
		expect(templatesService.takeCursor(id)).toBeNull();
	});

	it('clears a stale claim when the next note has no marker', async () => {
		const withMarker = await templatesService.create(null, {
			id: 't1',
			name: 'M',
			body: 'a{{cursor}}b'
		});
		const without = await templatesService.create(null, { id: 't2', name: 'P', body: 'plain' });
		expect(templatesService.takeCursor(withMarker)).toBeNull();
		expect(templatesService.takeCursor(without)).toBeNull();
	});
});
