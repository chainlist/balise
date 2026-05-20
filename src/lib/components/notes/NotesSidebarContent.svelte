<script lang="ts">
	import * as Sidebar from '$lib/components/shadcn/sidebar/index.js';
	import type { Note } from '$lib/services/notes.svelte';

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
		dateStyle: 'short',
		timeStyle: 'short'
	});

	function noteTitle(content: string): string {
		const first = content.split('\n')[0] ?? '';
		return first.replace(/^#{1,6}\s+/, '').trim() || 'Empty note';
	}
</script>

<Sidebar.Content>
	<Sidebar.Group>
		<Sidebar.GroupContent class="px-2">
			<Sidebar.Menu class="gap-2">
				{#if notes.length === 0}
					<p class="px-2 py-6 text-center text-sm text-muted-foreground">No notes yet.</p>
				{:else}
					{#each notes as note (note.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={selectedNoteId === note.id}
								onclick={() => onSelect(note.id)}
								class="h-auto rounded-xl border border-border bg-card px-3 py-3 hover:border-primary/20 hover:bg-card data-active:border-primary/40 data-active:bg-primary/8 data-active:text-foreground"
							>
								<div class="flex min-w-0 flex-col items-start gap-1">
									<span class="w-full truncate text-sm font-semibold text-foreground">
										{noteTitle(note.content)}
									</span>
									<span class="text-xs text-muted-foreground">
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
