<script lang="ts">
	import * as Command from '$lib/components/shadcn/command/index.js';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { tagsService, tagDisplayName } from '$lib/services/tags.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import { searchNotes, type NoteSearchResult } from '$lib/repositories/notes.repo';
	import { noteSignals } from '$lib/services/note-signals';
	import { getDB } from '$lib/utils/db';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FileTextIcon, TagIcon, ZapIcon } from '@lucide/svelte';
	import { tick } from 'svelte';

	let query = $state('');
	let noteResults = $state<NoteSearchResult[]>([]);
	let inputRef = $state<HTMLInputElement | null>(null);

	let filteredCommands = $derived(
		(query.trim()
			? APP_SHORTCUTS.filter(
					(s) =>
						s.name.toLowerCase().includes(query.toLowerCase()) ||
						s.description.toLowerCase().includes(query.toLowerCase())
				)
			: APP_SHORTCUTS
		).slice(0, 3)
	);

	let filteredTags = $derived(
		(query.trim()
			? tagsService.tags.filter((t) =>
					tagDisplayName(t).toLowerCase().includes(query.toLowerCase())
				)
			: tagsService.tags
		).slice(0, 3)
	);

	async function handleInput(value: string) {
		query = value;
		noteResults = value.trim().length >= 3 ? await searchNotes(getDB(), value) : [];
	}

	$effect(() => {
		if (uiState.isCommandPaletteOpen) {
			tick().then(() => inputRef?.select());
		}
	});

	async function selectNote(id: string) {
		uiState.isCommandPaletteOpen = false;
		await uiState.setActiveTag(null);
		await goto(resolve('/'));
		noteSignals.signalSelectNote(id);
	}

	function selectTag(tag: string) {
		uiState.isCommandPaletteOpen = false;
		uiState.setActiveTag(tag);
		goto(resolve('/'));
	}

	function runCommand(run: () => void | Promise<void>) {
		uiState.isCommandPaletteOpen = false;
		run();
	}
</script>

<Command.Dialog bind:open={uiState.isCommandPaletteOpen} shouldFilter={false} class="rounded">
	<Command.Input
		bind:ref={inputRef}
		class="rounded-xs"
		placeholder="Search notes, tags, commands..."
		value={query}
		oninput={(e) => handleInput(e.currentTarget.value)}
	/>
	<Command.List>
		<Command.Empty>No results found.</Command.Empty>

		{#if noteResults.length > 0}
			<Command.Group heading="Notes">
				{#each noteResults as note (note.id)}
					<Command.Item value={note.id} onSelect={() => selectNote(note.id)}>
						<FileTextIcon class="shrink-0" />
						<div class="flex min-w-0 flex-col">
							<span>{note.title || 'Untitled'}</span>
							{#if note.excerpt}
								<span class="fts-excerpt truncate text-xs text-muted-foreground">
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html note.excerpt}
								</span>
							{/if}
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if filteredTags.length > 0}
			<Command.Group heading="Tags">
				{#each filteredTags as tag (tag.tag)}
					<Command.Item value={tag.tag} onSelect={() => selectTag(tag.tag)}>
						<TagIcon />
						{tagDisplayName(tag)}
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if filteredCommands.length > 0}
			<Command.Group heading="Commands">
				{#each filteredCommands as cmd (cmd.id)}
					<Command.Item value={cmd.id} onSelect={() => runCommand(cmd.run)}>
						<ZapIcon />
						{cmd.name}
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
