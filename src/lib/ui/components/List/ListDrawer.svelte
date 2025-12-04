<script lang="ts">
	import { useState } from '$lib/states/index.svelte';
	import * as Drawer from '$lib/ui/components/shadcn/drawer/index.js';
	import { onMount } from 'svelte';
	import List from './List.svelte';

	const { app } = useState();

	const roots = $derived(app.entries.filter((e) => !e.parentId));
</script>

<Drawer.Root direction="right" bind:open={app.listDrawerOpened}>
	<Drawer.Content>
		{#each roots as root (root.id)}
			<List isRoot={true} entry={root} />
		{/each}
	</Drawer.Content>
</Drawer.Root>
