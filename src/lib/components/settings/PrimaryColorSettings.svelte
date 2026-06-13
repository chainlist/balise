<script lang="ts">
	import { Popover } from 'bits-ui';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { settingsService } from '$lib/services/settings.svelte';
	import { COLOR_PALETTE } from '$lib/utils/color-palette';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import { RotateCcwIcon } from '@lucide/svelte';
</script>

<div class="flex items-center justify-between gap-4">
	<div class="space-y-1.5">
		<p class="text-sm font-medium">{m.settings_primary_label()}</p>
		<p class="text-xs text-muted-foreground">{m.settings_primary_helper()}</p>
	</div>
	<div class="flex items-center gap-2">
		{#if settingsService.appearance.primaryColor}
			<Button
				variant="ghost"
				size="sm"
				class="text-muted-foreground"
				onclick={() => settingsService.resetPrimaryColor()}
			>
				<RotateCcwIcon size="14" />
				{m.settings_primary_reset()}
			</Button>
		{/if}

		<Popover.Root>
			<Popover.Trigger
				class="size-6 rounded-full border-2 border-white bg-primary shadow-md transition-transform hover:scale-110 dark:border-white/70"
				aria-label={m.settings_primary_aria()}
			/>
			<Popover.Portal>
				<Popover.Content
					sideOffset={6}
					class="z-50 grid grid-cols-6 gap-2 rounded-xl bg-popover p-3 shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
				>
					{#each COLOR_PALETTE as color (color)}
						<Popover.Close
							class={cn(
								'size-6 rounded-full transition-transform hover:scale-110',
								settingsService.appearance.primaryColor === color &&
									'ring-2 ring-primary ring-offset-2 ring-offset-popover'
							)}
							style="background-color: {color}"
							aria-label={color}
							onclick={() => settingsService.setPrimaryColor(color)}
						/>
					{/each}
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	</div>
</div>
