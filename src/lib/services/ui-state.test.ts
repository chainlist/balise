import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockStore = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn().mockResolvedValue(undefined) }));

vi.mock('@tauri-apps/plugin-store', () => ({
	load: vi.fn().mockResolvedValue(mockStore)
}));
vi.mock('$lib/services/desk', () => ({
	openDesk: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/services/notes.svelte', () => ({
	notesService: {
		load: vi.fn().mockResolvedValue(undefined)
	}
}));
vi.mock('$lib/services/tags.svelte', () => ({
	tagsService: {
		load: vi.fn().mockResolvedValue(undefined),
		loadRelated: vi.fn().mockResolvedValue(undefined)
	}
}));
vi.mock('$lib/services/fs-sync', () => ({
	fsSyncService: {
		syncDeskFiles: vi.fn().mockResolvedValue(undefined)
	}
}));
vi.mock('$lib/services/fs', () => ({
	fsService: {
		setDesk: vi.fn()
	}
}));

import { uiState } from './ui-state.svelte';
import { openDesk } from '$lib/services/desk';
import { notesService } from '$lib/services/notes.svelte';
import { tagsService } from '$lib/services/tags.svelte';

// Initialise the store once so the #store field is non-null,
// making store?.set(...) calls observable in every test.
beforeAll(async () => {
	mockStore.get.mockResolvedValue(null); // use built-in defaults
	await uiState.init();
});

beforeEach(() => {
	vi.clearAllMocks();
	// Re-apply implementations cleared by clearAllMocks
	mockStore.set.mockResolvedValue(undefined);
	mockStore.get.mockResolvedValue(null);
	uiState.desks = ['Personal'];
	uiState.activeDesk = 'Personal';
	uiState.activeTag = null;
	uiState.composedTags = [];
	uiState.ready = false;
});

// ─── addDesk ──────────────────────────────────────────────────────────────────

describe('addDesk', () => {
	it('adds a new desk to the list', async () => {
		await uiState.addDesk('Work');
		expect(uiState.desks).toContain('Work');
	});

	it('does not add a duplicate desk', async () => {
		await uiState.addDesk('Personal');
		expect(uiState.desks.filter((d) => d === 'Personal')).toHaveLength(1);
	});

	it('persists the updated desks list to the store', async () => {
		await uiState.addDesk('Work');
		expect(mockStore.set).toHaveBeenCalledWith('desks', expect.arrayContaining(['Work']));
	});
});

// ─── removeDesk ───────────────────────────────────────────────────────────────

describe('removeDesk', () => {
	beforeEach(() => {
		uiState.desks = ['Personal', 'Work'];
		uiState.activeDesk = 'Personal';
	});

	it('removes the desk from the list', async () => {
		await uiState.removeDesk('Work');
		expect(uiState.desks).not.toContain('Work');
	});

	it('throws when attempting to remove the last desk', async () => {
		uiState.desks = ['Personal'];
		await expect(uiState.removeDesk('Personal')).rejects.toThrow('You must keep at least one desk.');
	});

	it('does not throw for a non-existent desk', async () => {
		await expect(uiState.removeDesk('Ghost')).resolves.not.toThrow();
	});

	it('does not change active desk when removing a non-active desk', async () => {
		await uiState.removeDesk('Work');
		expect(uiState.activeDesk).toBe('Personal');
	});

	it('switches active desk to the first remaining desk when the active one is removed', async () => {
		uiState.activeDesk = 'Work';
		await uiState.removeDesk('Work');
		expect(uiState.activeDesk).toBe('Personal');
	});

	it('persists the updated desks list to the store', async () => {
		await uiState.removeDesk('Work');
		expect(mockStore.set).toHaveBeenCalledWith('desks', ['Personal']);
	});
});

// ─── setActiveTag ─────────────────────────────────────────────────────────────

describe('setActiveTag', () => {
	it('sets the active tag', async () => {
		await uiState.setActiveTag('work');
		expect(uiState.activeTag).toBe('work');
	});

	it('does nothing when the same tag is passed again', async () => {
		uiState.activeTag = 'work';
		await uiState.setActiveTag('work');
		expect(uiState.activeTag).toBe('work');
	});

	it('switches to a new tag without toggling', async () => {
		uiState.activeTag = 'work';
		await uiState.setActiveTag('todo');
		expect(uiState.activeTag).toBe('todo');
	});

	it('clears composedTags when the active tag changes', async () => {
		uiState.composedTags = ['urgent', 'todo'];
		await uiState.setActiveTag('work');
		expect(uiState.composedTags).toHaveLength(0);
	});

	it('does not clear composedTags when the same tag is passed again', async () => {
		uiState.activeTag = 'work';
		uiState.composedTags = ['urgent'];
		await uiState.setActiveTag('work');
		expect(uiState.composedTags).toHaveLength(1);
	});

	it('calls notesService.load with the new active tag', async () => {
		await uiState.setActiveTag('work');
		expect(notesService.load).toHaveBeenCalledWith('work');
	});

	it('calls tagsService.loadRelated with the new active tag', async () => {
		await uiState.setActiveTag('work');
		expect(tagsService.loadRelated).toHaveBeenCalledWith('work');
	});
});

// ─── toggleComposedTag ────────────────────────────────────────────────────────

describe('toggleComposedTag', () => {
	beforeEach(() => {
		uiState.activeTag = 'work';
	});

	it('adds the tag to composedTags when not present', async () => {
		await uiState.toggleComposedTag('urgent');
		expect(uiState.composedTags).toContain('urgent');
	});

	it('removes the tag from composedTags when already present', async () => {
		uiState.composedTags = ['urgent'];
		await uiState.toggleComposedTag('urgent');
		expect(uiState.composedTags).not.toContain('urgent');
	});

	it('can hold multiple composed tags simultaneously', async () => {
		await uiState.toggleComposedTag('urgent');
		await uiState.toggleComposedTag('todo');
		expect(uiState.composedTags).toContain('urgent');
		expect(uiState.composedTags).toContain('todo');
	});

	it('calls notesService.load with activeTag and the updated composedTags', async () => {
		await uiState.toggleComposedTag('urgent');
		expect(notesService.load).toHaveBeenCalledWith('work', ['urgent']);
	});

	it('calls tagsService.loadRelated with activeTag and the updated composedTags', async () => {
		await uiState.toggleComposedTag('urgent');
		expect(tagsService.loadRelated).toHaveBeenCalledWith('work', ['urgent']);
	});
});

// ─── switchDesk ───────────────────────────────────────────────────────────────

describe('switchDesk', () => {
	beforeEach(() => {
		uiState.activeTag = 'work';
		uiState.composedTags = ['urgent'];
		uiState.activeDesk = 'Personal';
	});

	it('resets activeTag to null', async () => {
		await uiState.switchDesk('Work');
		expect(uiState.activeTag).toBeNull();
	});

	it('resets composedTags to an empty array', async () => {
		await uiState.switchDesk('Work');
		expect(uiState.composedTags).toHaveLength(0);
	});

	it('calls openDesk with the new desk name', async () => {
		await uiState.switchDesk('Work');
		expect(openDesk).toHaveBeenCalledWith('Work');
	});

	it('sets activeDesk to the new desk', async () => {
		await uiState.switchDesk('Work');
		expect(uiState.activeDesk).toBe('Work');
	});

	it('calls tagsService.load after switching', async () => {
		await uiState.switchDesk('Work');
		expect(tagsService.load).toHaveBeenCalled();
	});

	it('calls notesService.load after switching', async () => {
		await uiState.switchDesk('Work');
		expect(notesService.load).toHaveBeenCalled();
	});

	it('calls tagsService.loadRelated with null after switching', async () => {
		await uiState.switchDesk('Work');
		expect(tagsService.loadRelated).toHaveBeenCalledWith(null);
	});
});
