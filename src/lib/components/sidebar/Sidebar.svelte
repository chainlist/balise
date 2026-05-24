<script lang="ts">
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import SidebarContent from '$lib/components/sidebar/SidebarContent.svelte';
	import SidebarFooter from '$lib/components/sidebar/SidebarFooter.svelte';
</script>

<div class="flex h-screen flex-col border-r bg-sidebar">
	<SidebarHeader />
	<SidebarContent />
	<SidebarFooter />
</div>
