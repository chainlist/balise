import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockStore = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn().mockResolvedValue(undefined) }));

vi.mock('@tauri-apps/plugin-store', () => ({
	load: vi.fn().mockResolvedValue(mockStore)
}));
vi.mock('$lib/services/desk', () => ({
	openDesk: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/services/notes.svelte', () => ({
	loadNotes: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/services/tags.svelte', () => ({
	loadTags: vi.fn().mockResolvedValue(undefined),
	loadRelatedTags: vi.fn().mockResolvedValue(undefined)
}));

import { uiState, addDesk, removeDesk, setActiveTag, toggleComposedTag, switchDesk, initUIState } from './ui-state.svelte';
import { openDesk } from '$lib/services/desk';
import { loadNotes } from '$lib/services/notes.svelte';
import { loadTags, loadRelatedTags } from '$lib/services/tags.svelte';

// Initialise the store once so the module-level `store` variable is non-null,
// making store?.set(...) calls observable in every test.
beforeAll(async () => {
	mockStore.get.mockResolvedValue(null); // use built-in defaults
	await initUIState();
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
		await addDesk('Work');
		expect(uiState.desks).toContain('Work');
	});

	it('does not add a duplicate desk', async () => {
		await addDesk('Personal');
		expect(uiState.desks.filter((d) => d === 'Personal')).toHaveLength(1);
	});

	it('persists the updated desks list to the store', async () => {
		await addDesk('Work');
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
		await removeDesk('Work');
		expect(uiState.desks).not.toContain('Work');
	});

	it('throws when attempting to remove the last desk', async () => {
		uiState.desks = ['Personal'];
		await expect(removeDesk('Personal')).rejects.toThrow('You must keep at least one desk.');
	});

	it('does not throw for a non-existent desk', async () => {
		await expect(removeDesk('Ghost')).resolves.not.toThrow();
	});

	it('does not change active desk when removing a non-active desk', async () => {
		await removeDesk('Work');
		expect(uiState.activeDesk).toBe('Personal');
	});

	it('switches active desk to the first remaining desk when the active one is removed', async () => {
		uiState.activeDesk = 'Work';
		await removeDesk('Work');
		expect(uiState.activeDesk).toBe('Personal');
	});

	it('persists the updated desks list to the store', async () => {
		await removeDesk('Work');
		expect(mockStore.set).toHaveBeenCalledWith('desks', ['Personal']);
	});
});

// ─── setActiveTag ─────────────────────────────────────────────────────────────

describe('setActiveTag', () => {
	it('sets the active tag', async () => {
		await setActiveTag('work');
		expect(uiState.activeTag).toBe('work');
	});

	it('toggles the tag off when the same tag is passed twice', async () => {
		uiState.activeTag = 'work';
		await setActiveTag('work');
		expect(uiState.activeTag).toBeNull();
	});

	it('switches to a new tag without toggling', async () => {
		uiState.activeTag = 'work';
		await setActiveTag('todo');
		expect(uiState.activeTag).toBe('todo');
	});

	it('clears composedTags when the active tag changes', async () => {
		uiState.composedTags = ['urgent', 'todo'];
		await setActiveTag('work');
		expect(uiState.composedTags).toHaveLength(0);
	});

	it('clears composedTags when the active tag is toggled off', async () => {
		uiState.activeTag = 'work';
		uiState.composedTags = ['urgent'];
		await setActiveTag('work');
		expect(uiState.composedTags).toHaveLength(0);
	});

	it('calls loadNotes with the new active tag', async () => {
		await setActiveTag('work');
		expect(loadNotes).toHaveBeenCalledWith('work');
	});

	it('calls loadRelatedTags with the new active tag', async () => {
		await setActiveTag('work');
		expect(loadRelatedTags).toHaveBeenCalledWith('work');
	});
});

// ─── toggleComposedTag ────────────────────────────────────────────────────────

describe('toggleComposedTag', () => {
	beforeEach(() => {
		uiState.activeTag = 'work';
	});

	it('adds the tag to composedTags when not present', async () => {
		await toggleComposedTag('urgent');
		expect(uiState.composedTags).toContain('urgent');
	});

	it('removes the tag from composedTags when already present', async () => {
		uiState.composedTags = ['urgent'];
		await toggleComposedTag('urgent');
		expect(uiState.composedTags).not.toContain('urgent');
	});

	it('can hold multiple composed tags simultaneously', async () => {
		await toggleComposedTag('urgent');
		await toggleComposedTag('todo');
		expect(uiState.composedTags).toContain('urgent');
		expect(uiState.composedTags).toContain('todo');
	});

	it('calls loadNotes with activeTag and the updated composedTags', async () => {
		await toggleComposedTag('urgent');
		expect(loadNotes).toHaveBeenCalledWith('work', ['urgent']);
	});

	it('calls loadRelatedTags with activeTag and the updated composedTags', async () => {
		await toggleComposedTag('urgent');
		expect(loadRelatedTags).toHaveBeenCalledWith('work', ['urgent']);
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
		await switchDesk('Work');
		expect(uiState.activeTag).toBeNull();
	});

	it('resets composedTags to an empty array', async () => {
		await switchDesk('Work');
		expect(uiState.composedTags).toHaveLength(0);
	});

	it('calls openDesk with the new desk name', async () => {
		await switchDesk('Work');
		expect(openDesk).toHaveBeenCalledWith('Work');
	});

	it('sets activeDesk to the new desk', async () => {
		await switchDesk('Work');
		expect(uiState.activeDesk).toBe('Work');
	});

	it('calls loadTags after switching', async () => {
		await switchDesk('Work');
		expect(loadTags).toHaveBeenCalled();
	});

	it('calls loadNotes after switching', async () => {
		await switchDesk('Work');
		expect(loadNotes).toHaveBeenCalled();
	});

	it('calls loadRelatedTags with null after switching', async () => {
		await switchDesk('Work');
		expect(loadRelatedTags).toHaveBeenCalledWith(null);
	});
});
