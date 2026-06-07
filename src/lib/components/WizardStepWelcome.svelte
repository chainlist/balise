<script lang="ts">
	import * as m from '$paraglide/messages.js';

	let { baseDir }: { baseDir: string } = $props();

	const welcomeFeatures = $derived([
		m.wizard_welcome_desc_1(),
		m.wizard_welcome_desc_2(),
		m.wizard_welcome_desc_3()
	]);
</script>

<h2 class="text-xl font-semibold">{m.wizard_welcome_title()}</h2>
<p class="mt-1 text-sm text-muted-foreground">{m.wizard_welcome_subtitle()}</p>
<ul class="mt-6 flex flex-col gap-3">
	{#each welcomeFeatures as desc, i (i)}
		<li class="flex items-start gap-3 text-sm">
			<span
				class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold"
				>✓</span
			>
			<span>
				{desc}
				{#if i === 2 && baseDir}
					<span class="mt-1 block font-mono text-xs text-muted-foreground">{baseDir}</span>
				{/if}
			</span>
		</li>
	{/each}
</ul>
