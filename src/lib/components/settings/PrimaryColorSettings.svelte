<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import * as m from '$paraglide/messages.js';
	import { RotateCcwIcon } from '@lucide/svelte';
</script>

<div class="flex items-center justify-between gap-4">
	<div class="space-y-1.5">
		<p class="text-sm font-medium">{m.settings_primary_label()}</p>
		<p class="text-xs text-muted-foreground">{m.settings_primary_helper()}</p>
	</div>
	<div class="flex items-center gap-2">
		{#if settingsService.appearance.state.primaryColor}
			<Button
				variant="ghost"
				size="sm"
				class="text-muted-foreground"
				onclick={() => settingsService.appearance.resetPrimaryColor()}
			>
				<RotateCcwIcon size="14" />
				{m.settings_primary_reset()}
			</Button>
		{/if}

		<ColorPicker
			value={settingsService.appearance.state.primaryColor}
			onpick={(color) => settingsService.appearance.setPrimaryColor(color)}
			triggerAriaLabel={m.settings_primary_aria()}
			triggerClass="size-6 rounded-full border-2 border-white bg-primary shadow-md transition-transform hover:scale-110 dark:border-white/70"
		/>
	</div>
</div>
