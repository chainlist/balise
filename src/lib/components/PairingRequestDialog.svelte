<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { MonitorSmartphoneIcon } from '@lucide/svelte';
	import { pairingService } from '$lib/services/pairing.svelte';
	import { formatDeviceId } from '$lib/utils/device-id';
	import * as m from '$paraglide/messages.js';

	const request = $derived(pairingService.current);
</script>

<Dialog.Root
	open={request !== null}
	onOpenChange={(next) => {
		if (!next) pairingService.respond(false);
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.pairing_request_title()}</Dialog.Title>
			<Dialog.Description>{m.pairing_request_question()}</Dialog.Description>
		</Dialog.Header>

		{#if request}
			<div class="flex items-center gap-3 px-6">
				<MonitorSmartphoneIcon size="20" class="shrink-0 text-muted-foreground" />
				<p class="min-w-0 flex-1 truncate font-mono text-sm">{formatDeviceId(request.deviceId)}</p>
			</div>
		{/if}

		<div class="flex justify-end gap-2 p-6">
			<Button variant="outline" onclick={() => pairingService.respond(false)}>
				{m.action_decline()}
			</Button>
			<Button onclick={() => pairingService.respond(true)}>{m.action_accept()}</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
