<script lang="ts">
	import { useState } from '$lib/states/index.svelte';
	import List from './List.svelte';

	const { app } = useState();

	const roots = $derived(app.entries.filter((e) => !e.parentId));
</script>

<div class="mx-auto w-md">
	{#each roots as root (root.id)}
		<List isRoot={true} entry={root} />
	{/each}
</div>
