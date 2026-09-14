<script lang="ts">
	import * as Command from '$lib/components/shadcn/command/index.js';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { desksService } from '$lib/services/desks.svelte';
	import { notesService } from '$lib/services/notes.svelte';
	import { templatesService } from '$lib/services/templates';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import { tagsService } from '$lib/services/tags.svelte';
	import { tagDisplayName } from '$lib/domain/tag';
	import { APP_SHORTCUTS } from '$lib/config/app-shortcuts';
	import type { NoteSearchResult } from '$lib/domain/note';
	import type { NoteTemplate } from '$lib/domain/template';
	import { eventBus } from '$lib/services/events/event-bus';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		FileTextIcon,
		TagIcon,
		ZapIcon,
		LayoutListIcon,
		LayoutTemplateIcon
	} from '@lucide/svelte';
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

	let filteredDesks = $derived(
		(query.trim()
			? desksService.desks.filter((d) => d.toLowerCase().includes(query.toLowerCase()))
			: desksService.desks
		)
			.filter((d) => d !== desksService.activeDesk)
			.slice(0, 3)
	);

	// A template's name may be empty while it is being written, so it is matched
	// (and listed) under the same fallback label the settings list shows.
	const templateLabel = (t: NoteTemplate) => t.name.trim() || m.settings_templates_untitled();

	let filteredTemplates = $derived(
		(query.trim()
			? templatesService.templates.filter((t) =>
					templateLabel(t).toLowerCase().includes(query.toLowerCase())
				)
			: templatesService.templates
		).slice(0, 3)
	);

	async function handleInput(value: string) {
		query = value;
		noteResults = await notesService.search(value);
	}

	$effect(() => {
		if (uiState.modal.isCommandPaletteOpen) {
			tick().then(() => inputRef?.select());
		}
	});

	async function selectNote(id: string) {
		uiState.modal.isCommandPaletteOpen = false;
		await uiState.setActiveTag(null);
		await goto(resolve('/'));
		eventBus.notes.select.emit(id);
	}

	function selectTag(tag: string) {
		uiState.modal.isCommandPaletteOpen = false;
		uiState.setActiveTag(tag);
		goto(resolve('/'));
	}

	async function selectDesk(desk: string) {
		uiState.modal.isCommandPaletteOpen = false;
		try {
			await desksService.switchDesk(desk);
			uiState.clearSelection();
			await goto(resolve('/'));
		} catch (e) {
			toasterService.error(m.desk_switch_error_failed(), errorMessage(e));
		}
	}

	/** Create a note seeded by the picked template and open it. Mirrors the
	 *  new-note shortcut: the sidebar's `notes.select` subscriber navigates. */
	async function createFromTemplate(template: NoteTemplate) {
		uiState.modal.isCommandPaletteOpen = false;
		try {
			const id = await templatesService.create(uiState.activeTag, template);
			eventBus.notes.select.emit(id);
		} catch (e) {
			toasterService.error(m.note_create_error_failed(), errorMessage(e));
		}
	}

	function runCommand(run: () => void | Promise<void>) {
		uiState.modal.isCommandPaletteOpen = false;
		run();
	}
</script>

<Command.Dialog bind:open={uiState.modal.isCommandPaletteOpen} shouldFilter={false} class="rounded">
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

		{#if filteredDesks.length > 0}
			<Command.Group heading={m.command_palette_group_desks()}>
				{#each filteredDesks as desk (desk)}
					<Command.Item value={`desk:${desk}`} onSelect={() => selectDesk(desk)}>
						<LayoutListIcon />
						<span class="min-w-0 flex-1 truncate">{desk}</span>
						<span
							class="shrink-0 text-xs text-muted-foreground opacity-0 group-data-[selected]/command-item:opacity-100"
						>
							{m.command_palette_switch_desk()}
						</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}

		{#if filteredTemplates.length > 0}
			<Command.Group heading={m.command_palette_group_templates()}>
				{#each filteredTemplates as template (template.id)}
					<Command.Item
						value={`template:${template.id}`}
						onSelect={() => createFromTemplate(template)}
					>
						<LayoutTemplateIcon />
						<span class="min-w-0 flex-1 truncate">{templateLabel(template)}</span>
						<span
							class="shrink-0 text-xs text-muted-foreground opacity-0 group-data-[selected]/command-item:opacity-100"
						>
							{m.shortcut_new_note_name()}
						</span>
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
