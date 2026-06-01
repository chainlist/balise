<script lang="ts">
	import SidebarHeader from '$lib/components/sidebar/SidebarHeader.svelte';
	import BrowseCard from '$lib/components/sidebar/BrowseCard.svelte';
	import TagsCard from '$lib/components/sidebar/TagsCard.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import * as m from '$paraglide/messages.js';
</script>

<div class="flex h-screen w-64 shrink-0 flex-col gap-2 bg-primary/5 p-3">
	<section class="flex flex-col overflow-hidden rounded bg-card shadow-md">
		<SidebarHeader />
	</section>
	<section class="flex flex-col overflow-hidden rounded bg-card shadow-md">
		<h2
			class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase"
		>
			{m.nav_browse()}
		</h2>
		<BrowseCard />
	</section>
	<section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded bg-card shadow-md">
		<h2
			class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase"
		>
			{m.nav_tags()}
		</h2>
		<TagsCard />
	</section>
</div>

<SettingsModal open={uiState.isSettingsOpen} />
