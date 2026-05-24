<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import SidebarContent from '$lib/components/sidebar/SidebarContent.svelte';
	import SidebarFooter from '$lib/components/sidebar/SidebarFooter.svelte';
</script>

<div class="flex h-screen flex-col">
	<SidebarHeader />
	<SidebarContent />
	<SidebarFooter />
</div>
