<script lang="ts">
	import { useState } from '$lib/states/index.svelte';
	import * as Drawer from '$lib/ui/components/shadcn/drawer/index.js';
	import Lists from './Lists.svelte';

	const { app } = useState();
</script>

<Drawer.Root direction="right" bind:open={app.listDrawerOpened}>
	<Drawer.Content>
		<Lists />
	</Drawer.Content>
</Drawer.Root>
