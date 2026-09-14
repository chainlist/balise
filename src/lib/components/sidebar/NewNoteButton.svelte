<script lang="ts">
	import { templatesService } from '$lib/services/templates';
	import type { NoteTemplate } from '$lib/domain/template';
	import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import { PlusIcon, ChevronDownIcon, StarIcon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';

	interface Props {
		/** Creates a note from the given template; `null` means the plain stub. */
		oncreate: (template: NoteTemplate | null) => void;
	}

	let { oncreate }: Props = $props();

	// The picker only earns its place once there is something to pick: with no
	// template configured the header keeps the plain "+" it has always had.
	const templates = $derived(templatesService.templates);
	const defaultId = $derived(templatesService.defaultTemplate?.id);
</script>

<Button
	variant="ghost"
	size="icon-sm"
	onclick={() => oncreate(templatesService.defaultTemplate)}
	aria-label={m.shortcut_new_note_name()}
	class="h-6 w-6 text-sidebar-foreground/60 hover:text-on-surface"
>
	<PlusIcon class="size-4" />
</Button>

{#if templates.length > 0}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="icon-sm"
					{...props}
					aria-label={m.note_new_from_template()}
					title={m.note_new_from_template()}
					class="h-6 w-4 text-sidebar-foreground/60 hover:text-on-surface"
				>
					<ChevronDownIcon class="size-3" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="frost-surface! w-56 rounded" align="end" side="bottom">
			<DropdownMenu.Item
				onclick={() => oncreate(null)}
				class="rounded dark:focus:bg-surface-container-high"
			>
				{m.note_template_blank()}
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<div class="scrollbar-thin max-h-60 overflow-auto">
				{#each templates as template (template.id)}
					<DropdownMenu.Item
						onclick={() => oncreate(template)}
						class="rounded dark:focus:bg-surface-container-high"
					>
						<span class="truncate">
							{template.name.trim() || m.settings_templates_untitled()}
						</span>
						{#if template.id === defaultId}
							<StarIcon size="12" fill="currentColor" class="ml-auto shrink-0 text-primary" />
						{/if}
					</DropdownMenu.Item>
				{/each}
			</div>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
