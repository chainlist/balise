<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import SidebarContent from '$lib/components/sidebar/SidebarContent.svelte';
	import SidebarFooter from '$lib/components/sidebar/SidebarFooter.svelte';
</script>

<Sidebar.Root>
	<SidebarHeader />
	<SidebarContent />
	<SidebarFooter />
</Sidebar.Root>
