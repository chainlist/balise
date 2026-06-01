<script lang="ts">
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import BrowseCard from '$lib/components/sidebar/BrowseCard.svelte';
	import TagsCard from '$lib/components/sidebar/TagsCard.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import * as m from '$paraglide/messages.js';
</script>

<div class="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
	<SidebarHeader />

	<div class="mt-2 flex flex-col">
		<h2
			class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase"
		>
			{m.nav_browse()}
		</h2>
		<BrowseCard />
	</div>

	<div class="mt-2 flex min-h-0 flex-1 flex-col">
		<h2
			class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase"
		>
			{m.nav_tags()}
		</h2>
		<TagsCard />
	</div>
</div>

<SettingsModal open={uiState.isSettingsOpen} />
