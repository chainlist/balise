import type { Entry } from '$lib/core/entry/model';
import { type Node, type Edge, useSvelteFlow, useStore } from '@xyflow/svelte';
import { SvelteDate } from 'svelte/reactivity';

export class AppState {
	entries = $state<Entry[]>([
		{
			id: '1',
			content: 'Root Node',
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		},
		{
			id: '2',
			parentId: '1',
			content: 'Child Node 1',
			width: 250,
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		},
		{
			id: '3',
			parentId: '1',
			content: 'Child Node 2',
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		},
		{
			id: '4',
			parentId: '1',
			content: 'Child Node 3',
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		},
		{
			id: '5',
			parentId: '4',
			content: 'Grandchild Node 1',
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		},
		{
			id: '6',
			parentId: '4',
			content: 'Grandchild Node 2',
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		},
		{
			id: '7',
			parentId: '4',
			content: 'Grandchild Node 3',
			fixed: true,
			x: 400,
			y: 200,
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		},
		{
			id: '8',
			parentId: '7',
			content: 'Grandchild Node 4',
			createdAt: new SvelteDate(),
			updatedAt: new SvelteDate()
		}
		// {
		// 	id: '9',
		// 	content: 'Root Node 2',
		// 	createdAt: new SvelteDate(),
		// 	updatedAt: new SvelteDate()
		// },
		// {
		// 	id: '10',
		// 	parentId: '9',
		// 	content: 'Child Node 4',
		// 	createdAt: new SvelteDate(),
		// 	updatedAt: new SvelteDate()
		// }
	]);

	nodes = $state.raw<Node[]>([]);
	edges = $state.raw<Edge[]>([]);
	focusedEntryId = $state<string>();
	hoveredNodeId = $state<string>();
	listDrawerOpened = $state<boolean>(false);

	flowInstance: ReturnType<typeof useSvelteFlow> | null = null;
	flowStore: ReturnType<typeof useStore> | null = null;
}
