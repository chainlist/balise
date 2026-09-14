<script lang="ts">
	import { TEMPLATE_PLACEHOLDERS, type NoteTemplate } from '$lib/domain/template';
	import { StarIcon, Trash2Icon } from '@lucide/svelte';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import * as m from '$paraglide/messages.js';

	interface Props {
		template: NoteTemplate;
		isDefault: boolean;
		onchange: (field: 'name' | 'body', value: string) => void;
		ontoggleDefault: () => void;
		onremove: () => void;
	}

	let { template, isDefault, onchange, ontoggleDefault, onremove }: Props = $props();
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
		{m.settings_templates_placeholders_hint()}
		<code class="rounded bg-muted px-1 py-0.5 font-mono">{TEMPLATE_PLACEHOLDERS.DATE}</code>
		<code class="rounded bg-muted px-1 py-0.5 font-mono">{TEMPLATE_PLACEHOLDERS.TITLE}</code>
	</p>

	<textarea
		value={template.body}
		placeholder={m.settings_templates_body_placeholder()}
		oninput={(e) => onchange('body', e.currentTarget.value)}
		class="scrollbar-thin min-h-0 flex-1 resize-none rounded border border-input bg-surface-container-lowest px-3 py-2 font-mono text-sm focus:ring-1 focus:ring-primary focus:outline-none"
	></textarea>
</div>
