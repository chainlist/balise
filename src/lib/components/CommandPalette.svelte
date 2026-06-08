<script lang="ts">
	import * as Command from '$lib/components/shadcn/command/index.js';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { modalState } from '$lib/services/modal-state.svelte';
	import { tagsService, tagDisplayName } from '$lib/services/tags.svelte';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import { searchNotes } from '$lib/repositories/notes.repo';
	import type { NoteSearchResult } from '$lib/models/note';
	import { noteSignals } from '$lib/services/note-signals';
	import { getDB } from '$lib/utils/db';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FileTextIcon, TagIcon, ZapIcon } from '@lucide/svelte';
	import { tick } from 'svelte';
	import * as m from '$paraglide/messages.js';

	let query = $state('');
	let noteResults = $state<NoteSearchResult[]>([]);
	let inputRef = $state<HTMLInputElement | null>(null);

	let filteredCommands = $derived(
		(query.trim()
			? APP_SHORTCUTS.filter(
					(s) =>
						s.name().toLowerCase().includes(query.toLowerCase()) ||
						s.description().toLowerCase().includes(query.toLowerCase())
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
		if (modalState.isCommandPaletteOpen) {
			tick().then(() => inputRef?.select());
		}
	});

	async function selectNote(id: string) {
		modalState.isCommandPaletteOpen = false;
		await uiState.setActiveTag(null);
		await goto(resolve('/'));
		noteSignals.signalSelectNote(id);
	}

	function selectTag(tag: string) {
		modalState.isCommandPaletteOpen = false;
		uiState.setActiveTag(tag);
		goto(resolve('/'));
	}

	function runCommand(run: () => void | Promise<void>) {
		modalState.isCommandPaletteOpen = false;
		run();
	}
</script>

<Command.Dialog bind:open={modalState.isCommandPaletteOpen} shouldFilter={false} class="rounded">
	<Command.Input
		bind:ref={inputRef}
		class="rounded-xs"
		placeholder={m.command_palette_placeholder()}
		value={query}
		oninput={(e) => handleInput(e.currentTarget.value)}
	/>
	<Command.List>
		<Command.Empty>{m.command_palette_no_results()}</Command.Empty>

		{#if noteResults.length > 0}
			<Command.Group heading={m.command_palette_group_notes()}>
				{#each noteResults as note (note.id)}
					<Command.Item value={note.id} onSelect={() => selectNote(note.id)}>
						<FileTextIcon class="shrink-0" />
						<div class="flex min-w-0 flex-col">
							<span>{note.title || m.note_untitled()}</span>
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
			<Command.Group heading={m.command_palette_group_tags()}>
				{#each filteredTags as tag (tag.tag)}
					<Command.Item value={tag.tag} onSelect={() => selectTag(tag.tag)}>
						<TagIcon />
						{tagDisplayName(tag)}
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if filteredCommands.length > 0}
			<Command.Group heading={m.command_palette_group_commands()}>
				{#each filteredCommands as cmd (cmd.id)}
					<Command.Item value={cmd.id} onSelect={() => runCommand(cmd.run)}>
						<ZapIcon />
						{cmd.name()}
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
