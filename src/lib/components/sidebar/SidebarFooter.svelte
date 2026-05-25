<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { Settings2Icon } from '@lucide/svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import SettingsModal from '$lib/components/settings/SettingsModal.svelte';
	import { page } from '$app/state';
	import * as m from '$paraglide/messages.js';
</script>

<hr />
<div class="flex flex-col gap-1 p-2">
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
