import { load, type Store } from '@tauri-apps/plugin-store';
import { openDesk } from './desk';
import { loadTags, loadRelatedTags } from './tags.svelte';
import { loadNotes } from './notes.svelte';

const defaultDesk = 'Personnal';
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
	ready: false
});

export async function initUIState(): Promise<void> {
	store = await load('ui-state.json', {
		autoSave: 100,
		defaults
	});

	const [activeDesk, desks] = await Promise.all([
		store.get<string>('activeDesk'),
		store.get<string[]>('desks')
	]);

	uiState.activeDesk = activeDesk ?? defaultDesk;
	uiState.desks = desks ?? [defaultDesk];

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
	const next = uiState.activeTag === tag ? null : tag;
	uiState.activeTag = next;
	uiState.composedTags = [];
	await Promise.all([loadNotes(next), loadRelatedTags(next)]);
}

export async function toggleComposedTag(tag: string): Promise<void> {
	const current = uiState.composedTags;
	const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
	uiState.composedTags = next;
	await Promise.all([
		loadNotes(uiState.activeTag, next),
		loadRelatedTags(uiState.activeTag, next)
	]);
}

export async function switchDesk(desk: string): Promise<void> {
	uiState.activeTag = null;
	uiState.composedTags = [];
	await openDesk(desk);
	await Promise.all([loadTags(), loadNotes(), loadRelatedTags(null)]);
	await setActiveDesk(desk);
}
