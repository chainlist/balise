<script lang="ts">
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import { createTemplate, type NoteTemplate } from '$lib/domain/template';
	import { PlusIcon, StarIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import SettingsSection from './SettingsSection.svelte';
	import NoteTemplateEditor from './NoteTemplateEditor.svelte';

	const section = settingsService.noteTemplates;
	const templates = $derived(section.state.templates);

	// The list is the master pane, the editor on the right the detail. Falling back
	// to the first template keeps a selection valid after a delete, and after an
	// add that lands before this runs, without an effect.
	let selectedId = $state<string | null>(null);
	const selected = $derived(templates.find((t) => t.id === selectedId) ?? templates[0] ?? null);

	function setTemplates(next: NoteTemplate[]) {
		section.setTemplates(next);
	}

	function updateSelected(field: 'name' | 'body', value: string) {
		setTemplates(templates.map((t) => (t.id === selected?.id ? { ...t, [field]: value } : t)));
	}

	function addTemplate() {
		const template = createTemplate('');
		setTemplates([...templates, template]);
		selectedId = template.id;
	}

	function removeSelected() {
		setTemplates(templates.filter((t) => t.id !== selected?.id));
		selectedId = null;
	}

	function toggleDefault() {
		if (!selected) return;
		section.setDefaultTemplate(
			section.state.defaultTemplateId === selected.id ? null : selected.id
		);
	}
</script>

<SettingsSection
	title={m.settings_templates_heading()}
	description={m.settings_templates_description()}
	bodyClass={null}
>
	<div class="flex min-h-0 flex-1">
		<div class="flex w-48 shrink-0 flex-col border-r">
			<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
				{#each templates as template (template.id)}
					<button
						type="button"
						onclick={() => (selectedId = template.id)}
						class="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm transition-colors {selected?.id ===
						template.id
							? 'bg-muted text-on-surface'
							: 'text-muted-foreground hover:bg-muted/50'}"
					>
						<span class="min-w-0 flex-1 truncate">
							{template.name.trim() || m.settings_templates_untitled()}
						</span>
						{#if template.id === section.state.defaultTemplateId}
							<StarIcon size="12" fill="currentColor" class="shrink-0 text-primary" />
						{/if}
					</button>
				{/each}
			</div>
			<div class="border-t p-2">
				<Button
					variant="outline"
					size="sm"
					onclick={addTemplate}
					class="w-full border-dashed text-muted-foreground"
				>
					<PlusIcon size="14" />
					{m.settings_templates_add()}
				</Button>
			</div>
		</div>

		<div class="min-h-0 flex-1">
			{#if selected}
				<NoteTemplateEditor
					template={selected}
					isDefault={selected.id === section.state.defaultTemplateId}
					onchange={updateSelected}
					ontoggleDefault={toggleDefault}
					onremove={removeSelected}
				/>
			{:else}
				<p class="px-6 py-5 text-sm text-muted-foreground">{m.settings_templates_empty()}</p>
			{/if}
		</div>
	</div>
</SettingsSection>
