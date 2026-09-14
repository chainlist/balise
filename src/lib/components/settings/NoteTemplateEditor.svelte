<script lang="ts">
	import { templateToken, type NoteTemplate } from '$lib/domain/template';
	import { mdTemplateVariables } from '$lib/utils/cm';
	import { templateVariableOptions } from './template-variables';
	import { StarIcon, Trash2Icon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import Editor from '$lib/components/notes/Editor.svelte';
	import * as m from '$paraglide/messages.js';

	interface Props {
		template: NoteTemplate;
		isDefault: boolean;
		onchange: (field: 'name' | 'body', value: string) => void;
		ontoggleDefault: () => void;
		onremove: () => void;
	}

	let { template, isDefault, onchange, ontoggleDefault, onremove }: Props = $props();

	// The body is edited in the note editor itself, so what the user writes is
	// rendered exactly as the note will be. On top of it, the `{{` suggestions and
	// the token styling. Built once: the descriptions follow the app language,
	// which only changes on reload.
	const { completion, extension } = mdTemplateVariables(templateVariableOptions());
</script>

<div class="flex h-full min-h-0 flex-col gap-3 px-6 py-5">
	<div class="flex items-center gap-2">
		<input
			type="text"
			value={template.name}
			placeholder={m.settings_templates_name_placeholder()}
			oninput={(e) => onchange('name', e.currentTarget.value)}
			class="h-8 min-w-0 flex-1 rounded border border-input bg-surface-container-lowest px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
		/>
		<Button
			variant={isDefault ? 'secondary' : 'outline'}
			size="sm"
			class="shrink-0 {isDefault ? 'text-primary' : 'text-muted-foreground'}"
			aria-pressed={isDefault}
			onclick={ontoggleDefault}
		>
			<StarIcon size="14" fill={isDefault ? 'currentColor' : 'none'} />
			{m.settings_templates_set_default()}
		</Button>
		<Button
			variant="ghost"
			size="icon-sm"
			class="shrink-0 text-muted-foreground hover:text-destructive"
			aria-label={m.settings_templates_delete()}
			title={m.settings_templates_delete()}
			onclick={onremove}
		>
			<Trash2Icon size="14" />
		</Button>
	</div>

	<p class="text-xs text-muted-foreground">
		{m.settings_templates_variables_hint()}
		<code class="rounded bg-muted px-1 py-0.5 font-mono">{'{{'}</code>
		{m.settings_templates_cursor_hint()}
		<code class="rounded bg-muted px-1 py-0.5 font-mono">{templateToken('cursor')}</code>
	</p>

	<!-- The editor owns its document from mount on, so a new selection needs a
	     fresh instance rather than a prop update. -->
	<div
		class="scrollbar-thin min-h-0 flex-1 overflow-y-auto rounded border border-input bg-surface-container-lowest px-3 py-2 focus-within:ring-1 focus-within:ring-primary"
	>
		{#key template.id}
			<Editor
				content={template.body}
				completionSources={[completion]}
				extraExtensions={[extension]}
				onchange={(value) => onchange('body', value)}
			/>
		{/key}
	</div>
</div>
