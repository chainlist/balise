<script lang="ts">
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as m from '$paraglide/messages.js';

	let {
		open = $bindable(false),
		onchoose
	}: { open?: boolean; onchoose: (choice: 'tray' | 'quit') => void } = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-fit">
		<Dialog.Header>
			<Dialog.Title>{m.close_behavior_title()}</Dialog.Title>
			<Dialog.Description>{m.close_behavior_description()}</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 p-6">
			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (open = false)}>
					{m.action_cancel()}
				</Button>
				<Button type="button" variant="outline" onclick={() => onchoose('tray')}>
					{m.close_behavior_tray()}
				</Button>
				<Button type="button" variant="destructive" onclick={() => onchoose('quit')}>
					{m.close_behavior_quit()}
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
