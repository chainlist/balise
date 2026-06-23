<script lang="ts">
	import { notesService } from '$lib/services/notes.svelte';
	import type { NoteListItem } from '$lib/domain/note';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import * as Dialog from '$lib/components/shadcn/dialog/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as m from '$paraglide/messages.js';

	let { note, open = $bindable() }: { note: NoteListItem; open: boolean } = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.note_delete_title()}</Dialog.Title>
			<Dialog.Description>{m.note_delete_description()}</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-end gap-2 p-6">
			<Button type="button" variant="outline" onclick={() => (open = false)}
				>{m.action_cancel()}</Button
			>
			<Button
				type="button"
				variant="destructive"
				onclick={async () => {
					try {
						await notesService.delete(note.id);
						open = false;
					} catch (e) {
						toasterService.error(m.note_delete_error_failed(), errorMessage(e));
					}
				}}>{m.action_delete()}</Button
			>
		</div>
	</Dialog.Content>
</Dialog.Root>
