<script lang="ts">
	import { ChevronUpIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	let {
		repulsion = $bindable(),
		linkDistance = $bindable(),
		hideIsolated = $bindable(),
		onclose
	}: {
		repulsion: number;
		linkDistance: number;
		hideIsolated: boolean;
		onclose: () => void;
	} = $props();
</script>

<div class="absolute top-8 right-8 z-10 w-64 rounded border bg-card p-4 shadow-md">
	<div class="mb-3 flex items-center justify-between">
		<h2 class="text-sm font-semibold text-foreground">{m.graph_settings_title()}</h2>
		<button
			type="button"
			class="rounded p-1 text-muted-foreground hover:text-foreground"
			onclick={onclose}
			aria-label={m.graph_settings_close()}
		>
			<ChevronUpIcon class="size-4" />
		</button>
	</div>

	<div class="space-y-4">
		<label class="block">
			<div class="mb-1 flex items-center justify-between">
				<div>
					<span class="text-xs text-foreground">{m.graph_settings_repulsion()}</span>
					<p class="text-[10px] text-muted-foreground">{m.graph_settings_repulsion_desc()}</p>
				</div>
				<span class="text-xs text-muted-foreground tabular-nums">{repulsion}</span>
			</div>
			<input type="range" min="100" max="800" step="20" bind:value={repulsion} class="w-full" />
		</label>

		<label class="block">
			<div class="mb-1 flex items-center justify-between">
				<div>
					<span class="text-xs text-foreground">{m.graph_settings_link_distance()}</span>
					<p class="text-[10px] text-muted-foreground">{m.graph_settings_link_distance_desc()}</p>
				</div>
				<span class="text-xs text-muted-foreground tabular-nums">{linkDistance}</span>
			</div>
			<input type="range" min="10" max="150" step="5" bind:value={linkDistance} class="w-full" />
		</label>

		<label class="flex items-start gap-2">
			<input type="checkbox" bind:checked={hideIsolated} class="mt-0.5" />
			<div>
				<span class="text-xs text-foreground">{m.graph_settings_hide_isolated()}</span>
				<p class="text-[10px] text-muted-foreground">{m.graph_settings_hide_isolated_desc()}</p>
			</div>
		</label>
	</div>
</div>
