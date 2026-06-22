<script lang="ts">
	import { ChevronUpIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	let {
		categoryCount = $bindable(),
		minStrength = $bindable(),
		onclose
	}: {
		categoryCount: number;
		minStrength: number;
		onclose: () => void;
	} = $props();
</script>

<div class="frost-surface absolute top-8 right-8 z-10 w-64 rounded p-4 shadow-md">
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
					<span class="text-xs text-foreground">{m.graph_settings_tags()}</span>
					<p class="text-[10px] text-muted-foreground">{m.graph_settings_tags_desc()}</p>
				</div>
				<span class="text-xs text-muted-foreground tabular-nums">{categoryCount}</span>
			</div>
			<input type="range" min="1" max={20} step="1" bind:value={categoryCount} class="w-full" />
		</label>

		<label class="block">
			<div class="mb-1 flex items-center justify-between">
				<span class="text-xs text-foreground">{m.graph_settings_min_cooccurrence()}</span>
				<span class="text-xs text-muted-foreground tabular-nums"
					>{Math.round(minStrength * 100)}%</span
				>
			</div>
			<input type="range" min="0" max="1" step="0.05" bind:value={minStrength} class="w-full" />
		</label>
	</div>
</div>
