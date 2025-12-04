<script lang="ts">
	import Node from './Node.svelte';
	import Settings from './Settings.svelte';
	import * as MenuBar from '$lib/ui/components/shadcn/menubar/index.js';
</script>

<div class="absolute top-2 left-2">
	<MenuBar.Root>
		<Settings />
		<Node />
	</MenuBar.Root>
</div>
