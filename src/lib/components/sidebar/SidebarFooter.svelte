<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Settings2Icon, LayoutDashboardIcon } from '@lucide/svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { page } from '$app/state';

	const isDashboard = $derived(page.url.pathname === '/dashboard');
</script>

<Sidebar.Footer class="gap-2 border-t border-sidebar-border pt-3 pb-4">
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<Button
				variant="ghost"
				size="sm"
				href="/dashboard"
				class="w-full justify-start gap-2 {isDashboard
					? 'bg-sidebar-accent text-sidebar-foreground'
					: 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'}"
			>
				<LayoutDashboardIcon class="size-4" />
				Dashboard
			</Button>
		</Sidebar.MenuItem>
		<Sidebar.MenuItem>
			<Button
				variant="ghost"
				size="sm"
				class="w-full justify-start gap-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
				onclick={() => (uiState.isSettingsOpen = true)}
			>
				<Settings2Icon class="size-4" />
				Settings
			</Button>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Footer>

<SettingsModal open={uiState.isSettingsOpen} />
