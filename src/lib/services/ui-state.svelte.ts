import { load, type Store } from '@tauri-apps/plugin-store';
import { openDesk } from './desk';
import { loadTags, loadRelatedTags } from './tags.svelte';
import { loadNotes } from './notes.svelte';

const defaultDesk = 'Personal';
const defaults = {
	activeDesk: defaultDesk,
	desks: [defaultDesk]
};

let store: Store | null = null;

export const uiState = $state({
	activeDesk: defaultDesk,
	desks: [defaultDesk] as string[],
	activeTag: null as string | null,
	composedTags: [] as string[],
	ready: false,
	isSettingsOpen: false,
	isCapturingShortcut: false,
	activeNoteId: null as string | null
});

export async function initUIState(): Promise<void> {
	store = await load('ui-state.json', {
		autoSave: 100,
		defaults
	});

	const [activeDesk, desks, activeTag] = await Promise.all([
		store.get<string>('activeDesk'),
		store.get<string[]>('desks'),
		store.get<string>('activeTag')
	]);

	uiState.activeDesk = activeDesk ?? defaultDesk;
	uiState.desks = desks ?? [defaultDesk];
	uiState.activeTag = activeTag ?? null;

	if (!uiState.desks.includes(uiState.activeDesk)) {
		uiState.desks = [...uiState.desks, uiState.activeDesk];
	}

	uiState.ready = true;
}

export async function setActiveDesk(desk: string): Promise<void> {
	uiState.activeDesk = desk;
	await store?.set('activeDesk', desk);
}

export async function setDesks(desks: string[]): Promise<void> {
	uiState.desks = desks;
	await store?.set('desks', desks);
}

export async function addDesk(desk: string): Promise<void> {
	if (uiState.desks.includes(desk)) return;
	const next = [...uiState.desks, desk];
	await setDesks(next);
}

export async function removeDesk(desk: string): Promise<void> {
	if (!uiState.desks.includes(desk)) return;
	if (uiState.desks.length <= 1) {
		throw new Error('You must keep at least one desk.');
	}

	const next = uiState.desks.filter((value) => value !== desk);
	await setDesks(next);

	if (uiState.activeDesk === desk) {
		await setActiveDesk(next[0]);
	}
}

export async function setActiveTag(tag: string | null): Promise<void> {
	if (uiState.activeTag === tag) return;

	uiState.activeTag = tag;
	uiState.composedTags = [];
	await Promise.all([
		store?.set('activeTag', tag),
		loadNotes(tag),
		loadRelatedTags(tag)
	]);
}

export async function toggleComposedTag(tag: string): Promise<void> {
	const current = uiState.composedTags;
	const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
	uiState.composedTags = next;
	await Promise.all([loadNotes(uiState.activeTag, next), loadRelatedTags(uiState.activeTag, next)]);
}

export async function switchDesk(desk: string, activeTag: string | null = null): Promise<void> {
	if (uiState.activeTag !== activeTag) {
		uiState.activeTag = activeTag;
	}

	uiState.composedTags = [];
	await openDesk(desk);
	await Promise.all([loadTags(), loadNotes(activeTag), loadRelatedTags(null)]);
	await setActiveDesk(desk);
}
