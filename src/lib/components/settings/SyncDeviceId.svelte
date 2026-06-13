<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { TriangleAlertIcon } from '@lucide/svelte';
	import { getDeviceId, deviceIdGroups } from '$lib/utils/device-id';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import * as m from '$paraglide/messages.js';

	let idGroups = $state<string[]>([]);
	let qrSvg = $state('');

	onMount(async () => {
		try {
			const id = await getDeviceId();
			idGroups = deviceIdGroups(id);
			qrSvg = await QRCode.toString(id, { type: 'svg', margin: 0 });
		} catch (e) {
			toasterService.error(m.settings_sync_id_error(), errorMessage(e));
		}
	});
</script>

<div class="flex flex-col items-center gap-6">
	<div class="flex flex-col items-center gap-2">
		<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
			{m.settings_sync_id_label()}
		</p>
		<div
			class="flex max-w-sm flex-wrap justify-center gap-x-2 gap-y-1 font-mono text-lg font-semibold tracking-wide"
		>
			{#each idGroups as group, i (i)}
				<span>{group}</span>
			{/each}
		</div>
	</div>

	{#if qrSvg}
		<div class="size-44 rounded-lg bg-white p-3 [&>svg]:size-full">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html qrSvg}
		</div>
	{/if}

	<p class="max-w-xs text-center text-sm text-muted-foreground">
		{m.settings_sync_pairing_instructions()}
	</p>

	<div
		class="flex max-w-xs items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
	>
		<TriangleAlertIcon size="14" class="mt-0.5 shrink-0" />
		<span>{m.settings_sync_id_warning()}</span>
	</div>
</div>
