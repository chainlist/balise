<script lang="ts">
	import Node from './Node.svelte';
	import Settings from './Settings.svelte';
	import * as MenuBar from '$lib/ui/components/shadcn/menubar/index.js';
</script>

<MenuBar.Root>
	<Settings />
	<Node />
</MenuBar.Root>
