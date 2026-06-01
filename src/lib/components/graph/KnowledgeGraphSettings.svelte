<script lang="ts">
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { ChevronUpIcon, SettingsIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import type { GraphSettings } from './types';

	let {
		settings = $bindable(),
		maxCooccurrence
	}: {
		settings: GraphSettings;
		maxCooccurrence: number;
	} = $props();

	let open = $state(true);
</script>

{#if open}
	<div
		class="bg-card absolute top-4 right-4 z-10 w-72 rounded-lg border p-4 shadow-md"
	>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-foreground text-sm font-semibold">{m.graph_settings_title()}</h2>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded p-1"
				onclick={() => (open = false)}
				aria-label={m.graph_settings_close()}
			>
				<ChevronUpIcon class="size-4" />
			</button>
		</div>

		<div class="space-y-4">
			<label class="block">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-foreground text-xs">{m.graph_settings_min_cooccurrence()}</span>
					<span class="text-muted-foreground text-xs tabular-nums">{settings.minCooccurrence}</span>
				</div>
				<input
					type="range"
					min="1"
					max={Math.max(1, maxCooccurrence)}
					step="1"
					bind:value={settings.minCooccurrence}
					class="w-full"
				/>
			</label>

			<label class="flex items-center gap-2 text-xs">
				<input type="checkbox" bind:checked={settings.hideIsolated} />
				<span class="text-foreground">{m.graph_settings_hide_isolated()}</span>
			</label>

			<div>
				<div class="text-foreground mb-1 text-xs">{m.graph_settings_node_size_by()}</div>
				<div class="flex gap-3 text-xs">
					<label class="flex items-center gap-1">
						<input type="radio" bind:group={settings.nodeSizeBy} value="count" />
						<span class="text-foreground">{m.graph_settings_node_size_count()}</span>
					</label>
					<label class="flex items-center gap-1">
						<input type="radio" bind:group={settings.nodeSizeBy} value="degree" />
						<span class="text-foreground">{m.graph_settings_node_size_degree()}</span>
					</label>
				</div>
			</div>

			<div class="border-border border-t pt-3">
				<label class="block">
					<div class="mb-1 flex items-center justify-between">
						<span class="text-foreground text-xs">{m.graph_settings_charge()}</span>
						<span class="text-muted-foreground text-xs tabular-nums">{settings.chargeStrength}</span>
					</div>
					<input
						type="range"
						min="-600"
						max="-20"
						step="10"
						bind:value={settings.chargeStrength}
						class="w-full"
					/>
				</label>

				<label class="mt-3 block">
					<div class="mb-1 flex items-center justify-between">
						<span class="text-foreground text-xs">{m.graph_settings_link_distance()}</span>
						<span class="text-muted-foreground text-xs tabular-nums">{settings.linkDistance}</span>
					</div>
					<input
						type="range"
						min="20"
						max="200"
						step="5"
						bind:value={settings.linkDistance}
						class="w-full"
					/>
				</label>

				<label class="mt-3 block">
					<div class="mb-1 flex items-center justify-between">
						<span class="text-foreground text-xs">{m.graph_settings_link_strength()}</span>
						<span class="text-muted-foreground text-xs tabular-nums"
							>{settings.linkStrength.toFixed(2)}</span
						>
					</div>
					<input
						type="range"
						min="0"
						max="1"
						step="0.05"
						bind:value={settings.linkStrength}
						class="w-full"
					/>
				</label>
			</div>
		</div>
	</div>
{:else}
	<Button
		variant="outline"
		size="sm"
		class="absolute top-4 right-4 z-10"
		onclick={() => (open = true)}
	>
		<SettingsIcon class="size-4" />
		{m.graph_settings_title()}
	</Button>
{/if}
