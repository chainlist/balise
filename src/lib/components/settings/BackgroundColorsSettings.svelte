<script lang="ts">
	import { Switch } from 'bits-ui';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import { settingsService } from '$lib/core/services/settings/settings.svelte';
	import {
		DEFAULT_MESH_COLORS,
		DEFAULT_MESH_SIZES,
		DEFAULT_MESH_UNIFIED_COLOR,
		MESH_MODES,
		type MeshMode
	} from '$lib/core/domain/settings';
	import SegmentedToggle from '$lib/components/SegmentedToggle.svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';
	import { RotateCcwIcon } from '@lucide/svelte';

	/* Order matches settingsService.appearance.state.meshColors: top-left, top-right, bottom-right, bottom-left */
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
		settingsService.appearance.state.meshMode !== MESH_MODES.CORNERS ||
			settingsService.appearance.state.meshUnifiedColor !== DEFAULT_MESH_UNIFIED_COLOR ||
			settingsService.appearance.state.meshColors.some((color, i) => color !== DEFAULT_MESH_COLORS[i]) ||
			settingsService.appearance.state.meshSizes.some((size, i) => size !== DEFAULT_MESH_SIZES[i])
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
					onclick={() => settingsService.appearance.resetMesh()}
				>
					<RotateCcwIcon size="14" />
					{m.settings_background_reset()}
				</Button>
			{/if}

			<Switch.Root
				checked={settingsService.appearance.state.meshEnabled}
				onCheckedChange={(checked) => settingsService.appearance.setMeshEnabled(checked)}
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
			!settingsService.appearance.state.meshEnabled && 'pointer-events-none opacity-50'
		)}
	>
		<SegmentedToggle
			options={modes}
			value={settingsService.appearance.state.meshMode}
			onValueChange={(mode) => settingsService.appearance.setMeshMode(mode)}
		/>

		<div class="relative mx-auto h-44 max-w-md rounded-xl border bg-mesh dark:bg-mesh-dark">
			{#if settingsService.appearance.state.meshMode === MESH_MODES.CORNERS}
				{#each corners as corner (corner.index)}
					<ColorPicker
						value={settingsService.appearance.state.meshColors[corner.index]}
						onpick={(color) => settingsService.appearance.setMeshColor(corner.index, color)}
						triggerAriaLabel={m.settings_background_corner_aria()}
						triggerClass={cn(
							'absolute size-6 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 dark:border-white/70',
							corner.position
						)}
						triggerStyle="background-color: {settingsService.appearance.state.meshColors[corner.index]}"
					>
						{#snippet extra()}
							<label class="block space-y-1">
								<span class="text-xs font-medium text-muted-foreground">
									{m.settings_background_size_label()}
								</span>
								<input
									type="range"
									min="50"
									max="200"
									step="10"
									value={settingsService.appearance.state.meshSizes[corner.index] * 100}
									oninput={(e) =>
										settingsService.appearance.setMeshSize(
											corner.index,
											Number(e.currentTarget.value) / 100
										)}
									class="w-full accent-primary"
								/>
							</label>
						{/snippet}
					</ColorPicker>
				{/each}
			{:else}
				<ColorPicker
					value={settingsService.appearance.state.meshUnifiedColor}
					onpick={(color) => settingsService.appearance.setMeshUnifiedColor(color)}
					triggerAriaLabel={m.settings_background_unified_aria()}
					triggerClass="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 dark:border-white/70"
					triggerStyle="background-color: {settingsService.appearance.state.meshUnifiedColor}"
				/>
			{/if}
		</div>
	</div>
</div>
