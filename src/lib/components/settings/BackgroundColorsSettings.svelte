<script lang="ts">
	import { Popover, Switch } from 'bits-ui';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { settingsService, DEFAULT_MESH_COLORS } from '$lib/services/settings.svelte';
	import { COLOR_PALETTE } from '$lib/utils/color-palette';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import { RotateCcwIcon } from '@lucide/svelte';

	/* Order matches settingsService.meshColors: top-left, top-right, bottom-right, bottom-left */
	const corners = [
		{ index: 0, position: 'top-2 left-2' },
		{ index: 1, position: 'top-2 right-2' },
		{ index: 2, position: 'bottom-2 right-2' },
		{ index: 3, position: 'bottom-2 left-2' }
	];

	const isCustomized = $derived(
		settingsService.meshColors.some((color, i) => color !== DEFAULT_MESH_COLORS[i])
	);
</script>

<div>
	<div class="mb-4 flex items-center justify-between gap-4">
		<div class="space-y-1.5">
			<p class="text-sm font-medium">{m.settings_background_label()}</p>
			<p class="text-xs text-muted-foreground">{m.settings_background_helper()}</p>
		</div>
		<div class="flex items-center gap-2">
			{#if isCustomized}
				<Button
					variant="ghost"
					size="sm"
					class="text-muted-foreground"
					onclick={() => settingsService.resetMeshColors()}
				>
					<RotateCcwIcon size="14" />
					{m.settings_background_reset()}
				</Button>
			{/if}

			<Switch.Root
				checked={settingsService.meshEnabled}
				onCheckedChange={(checked) => settingsService.setMeshEnabled(checked)}
				aria-label={m.settings_background_enable_aria()}
				class="inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-container-highest"
			>
				<Switch.Thumb
					class="pointer-events-none block size-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
				/>
			</Switch.Root>
		</div>
	</div>

	<div
		class={cn(
			'relative mx-auto h-44 max-w-md rounded-xl border bg-mesh transition-opacity duration-300 dark:bg-mesh-dark',
			!settingsService.meshEnabled && 'pointer-events-none opacity-50'
		)}
	>
		{#each corners as corner (corner.index)}
			<Popover.Root>
				<Popover.Trigger
					class={cn(
						'absolute size-6 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 dark:border-white/70',
						corner.position
					)}
					style="background-color: {settingsService.meshColors[corner.index]}"
					aria-label={m.settings_background_corner_aria()}
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
									settingsService.meshColors[corner.index] === color &&
										'ring-2 ring-primary ring-offset-2 ring-offset-popover'
								)}
								style="background-color: {color}"
								aria-label={color}
								onclick={() => settingsService.setMeshColor(corner.index, color)}
							/>
						{/each}
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>
		{/each}
	</div>
</div>
