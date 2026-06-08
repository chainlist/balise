<script lang="ts">
	import { notesService, type Note } from '$lib/services/notes.svelte';
	import * as Sheet from '$lib/components/shadcn/sheet/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as m from '$paraglide/messages.js';

	let { note, open = $bindable() }: { note: Note; open: boolean } = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full sm:max-w-md">
		<Sheet.Header class="gap-2 border-b p-6">
			<Sheet.Title>{m.note_delete_title()}</Sheet.Title>
			<Sheet.Description>{m.note_delete_description()}</Sheet.Description>
		</Sheet.Header>
		<div class="flex justify-end gap-2 p-6">
			<Button type="button" variant="outline" onclick={() => (open = false)}>{m.action_cancel()}</Button>
			<Button
				type="button"
				variant="destructive"
				onclick={async () => {
					await notesService.delete(note.id);
					open = false;
				}}>{m.action_delete()}</Button
			>
		</div>
	</Sheet.Content>
</Sheet.Root>
