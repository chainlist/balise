<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import type { Note } from '$lib/services/notes.svelte';
	import * as m from '$paraglide/messages.js';

	let {
		notes,
		selectedNoteId,
		onSelect
	}: {
		notes: Note[];
		selectedNoteId: string | null;
		onSelect: (noteId: string) => void;
	} = $props();

	const intl = new Intl.DateTimeFormat(navigator.language, {
		dateStyle: 'short'
	});
</script>

<Sidebar.Content>
	<Sidebar.Group>
		<Sidebar.GroupContent class="px-2">
			<Sidebar.Menu class="gap-2">
				{#if notes.length === 0}
					<p class="px-2 py-6 text-center text-sm text-muted-foreground">{m.no_notes_yet()}</p>
				{:else}
					{#each notes as note (note.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={selectedNoteId === note.id}
								onclick={() => onSelect(note.id)}
								class="h-auto rounded border border-outline-variant/60 px-3 py-3 hover:border-outline-variant data-active:border-primary/40 data-active:bg-surface-container-lowest data-active:text-on-surface "
							>
								<div class="flex min-w-0 flex-col items-start gap-2">
									<span class="w-full truncate text-sm font-semibold text-on-surface">
										{note.title || m.note_untitled()}
									</span>
									<span class="text-xs text-neutral-400">
										{intl.format(new Date(note.updated_at))}
									</span>
								</div>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				{/if}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
	</Sidebar.Group>
</Sidebar.Content>
