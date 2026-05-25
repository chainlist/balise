<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Settings2Icon, LayoutDashboardIcon } from '@lucide/svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { page } from '$app/state';
	import * as m from '$paraglide/messages.js';

	const isDashboard = $derived(page.url.pathname === '/dashboard');
</script>

<hr />
<div class="flex flex-col gap-1 p-2">
	<Button
		variant="ghost"
		size="sm"
		href="/dashboard"
		class="w-full justify-start gap-2 {isDashboard
			? 'bg-sidebar-accent text-sidebar-foreground'
			: 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'}"
	>
		<LayoutDashboardIcon class="size-4" />
		{m.nav_dashboard()}
	</Button>
	<Button
		variant="ghost"
		size="sm"
		class="w-full justify-start gap-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
		onclick={() => (uiState.isSettingsOpen = true)}
	>
		<Settings2Icon class="size-4" />
		{m.nav_settings()}
	</Button>
</div>

<SettingsModal open={uiState.isSettingsOpen} />
