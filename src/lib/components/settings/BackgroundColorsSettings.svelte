<script lang="ts">
	import { Popover, Switch } from 'bits-ui';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import {
		settingsService,
		DEFAULT_MESH_COLORS,
		DEFAULT_MESH_SIZES,
		DEFAULT_MESH_UNIFIED_COLOR,
		MESH_MODES,
		type MeshMode
	} from '$lib/services/settings.svelte';
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

	const modes: { value: MeshMode; label: () => string }[] = [
		{ value: MESH_MODES.CORNERS, label: m.settings_background_mode_corners },
		{ value: MESH_MODES.UNIFIED, label: m.settings_background_mode_unified }
	];

	const isCustomized = $derived(
		settingsService.meshMode !== MESH_MODES.CORNERS ||
			settingsService.meshUnifiedColor !== DEFAULT_MESH_UNIFIED_COLOR ||
			settingsService.meshColors.some((color, i) => color !== DEFAULT_MESH_COLORS[i]) ||
			settingsService.meshSizes.some((size, i) => size !== DEFAULT_MESH_SIZES[i])
	);
</script>

{#snippet palette(selected: string, onPick: (color: string) => void)}
	<div class="grid grid-cols-6 gap-2">
		{#each COLOR_PALETTE as color (color)}
			<Popover.Close
				class={cn(
					'size-6 rounded-full transition-transform hover:scale-110',
					selected === color && 'ring-2 ring-primary ring-offset-2 ring-offset-popover'
				)}
				style="background-color: {color}"
				aria-label={color}
				onclick={() => onPick(color)}
			/>
		{/each}
	</div>
{/snippet}

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
					onclick={() => settingsService.resetMesh()}
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
			'space-y-3 transition-opacity duration-300',
			!settingsService.meshEnabled && 'pointer-events-none opacity-50'
		)}
	>
		<div class="flex w-fit gap-1 rounded-lg bg-surface-container-highest p-1">
			{#each modes as mode (mode.value)}
				<button
					onclick={() => settingsService.setMeshMode(mode.value)}
					class={cn(
						'rounded-md px-3 py-1 text-xs font-medium transition-colors',
						settingsService.meshMode === mode.value
							? 'bg-popover text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'
					)}
				>
					{mode.label()}
				</button>
			{/each}
		</div>

		<div class="relative mx-auto h-44 max-w-md rounded-xl border bg-mesh dark:bg-mesh-dark">
			{#if settingsService.meshMode === MESH_MODES.CORNERS}
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
								class="z-50 space-y-3 rounded-xl bg-popover p-3 shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
							>
								{@render palette(settingsService.meshColors[corner.index], (color) =>
									settingsService.setMeshColor(corner.index, color)
								)}
								<label class="block space-y-1">
									<span class="text-xs font-medium text-muted-foreground">
										{m.settings_background_size_label()}
									</span>
									<input
										type="range"
										min="50"
										max="200"
										step="10"
										value={settingsService.meshSizes[corner.index] * 100}
										oninput={(e) =>
											settingsService.setMeshSize(
												corner.index,
												Number(e.currentTarget.value) / 100
											)}
										class="w-full accent-primary"
									/>
								</label>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				{/each}
			{:else}
				<Popover.Root>
					<Popover.Trigger
						class="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 dark:border-white/70"
						style="background-color: {settingsService.meshUnifiedColor}"
						aria-label={m.settings_background_unified_aria()}
					/>
					<Popover.Portal>
						<Popover.Content
							sideOffset={6}
							class="z-50 rounded-xl bg-popover p-3 shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
						>
							{@render palette(settingsService.meshUnifiedColor, (color) =>
								settingsService.setMeshUnifiedColor(color)
							)}
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>
			{/if}
		</div>
	</div>
</div>
