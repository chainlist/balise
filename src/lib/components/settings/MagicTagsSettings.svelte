<script lang="ts">
	import { settingsService } from '$lib/services/settings/settings.svelte';
	import {
		MAGIC_TAG_MATCH_TYPES,
		type MagicTagRule,
		type MagicTagMatchType
	} from '$lib/domain/settings';
	import { ArrowRightIcon, PlusIcon, Trash2Icon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import * as Select from '$lib/components/shadcn/select/index.js';
	import { Button } from '$lib/components/shadcn/button/index.js';
	import SettingsSection from './SettingsSection.svelte';

	const matchTypeLabels: Record<MagicTagMatchType, () => string> = {
		[MAGIC_TAG_MATCH_TYPES.STARTS_WITH]: m.settings_magic_tags_match_starts_with,
		[MAGIC_TAG_MATCH_TYPES.ENDS_WITH]: m.settings_magic_tags_match_ends_with,
		[MAGIC_TAG_MATCH_TYPES.CONTAINS]: m.settings_magic_tags_match_contains,
		[MAGIC_TAG_MATCH_TYPES.CONTAINS_WORD]: m.settings_magic_tags_match_contains_word
	};

	function buildExample(matchType: MagicTagMatchType): { before: string; after: string } {
		switch (matchType) {
			case MAGIC_TAG_MATCH_TYPES.STARTS_WITH:
				return { before: '', after: ' lorem ipsum dolor sit' };
			case MAGIC_TAG_MATCH_TYPES.ENDS_WITH:
				return { before: 'lorem ipsum dolor sit ', after: '' };
			case MAGIC_TAG_MATCH_TYPES.CONTAINS:
				return { before: 'lorem', after: 'ipsum dolor sit amet' };
			case MAGIC_TAG_MATCH_TYPES.CONTAINS_WORD:
				return { before: 'lorem ', after: ' ipsum dolor sit amet' };
		}
	}

	let rules = $state(settingsService.magicTags.state.tags.map((r) => ({ ...r })));

	function save() {
		settingsService.magicTags.setMagicTags(rules.map((r) => ({ ...r })));
	}

	function addRule() {
		rules = [...rules, { pattern: '', matchType: MAGIC_TAG_MATCH_TYPES.CONTAINS, tag: '' }];
		save();
	}

	function removeRule(index: number) {
		rules = rules.filter((_, i) => i !== index);
		save();
	}

	function updateRule(index: number, field: keyof MagicTagRule, value: string) {
		rules = rules.map((r, i) => (i === index ? { ...r, [field]: value } : r));
		save();
	}

	const inputClass =
		'h-[30px] flex-1 rounded border border-input bg-surface-container-lowest px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary';
</script>

<SettingsSection
	title={m.settings_magic_tags_heading()}
	description={m.settings_magic_tags_description()}
	bodyClass="space-y-4"
>
	{#each rules as rule, i (i)}
			{@const ex = buildExample(rule.matchType)}
			<div class="rounded-lg border bg-muted/30 p-2.5">
				<div class="flex items-center gap-2">
					<Select.Root
						type="single"
						value={rule.matchType}
						onValueChange={(v) => v && updateRule(i, 'matchType', v)}
					>
						<Select.Trigger class="w-36 shrink-0">
							{matchTypeLabels[rule.matchType]()}
						</Select.Trigger>
						<Select.Content>
							{#each Object.values(MAGIC_TAG_MATCH_TYPES) as type (type)}
								<Select.Item value={type} label={matchTypeLabels[type]()} />
							{/each}
						</Select.Content>
					</Select.Root>
					<input
						type="text"
						value={rule.pattern}
						placeholder={m.settings_magic_tags_pattern_placeholder()}
						oninput={(e) => updateRule(i, 'pattern', e.currentTarget.value)}
						class="{inputClass} font-mono"
					/>
					<ArrowRightIcon size="14" class="shrink-0 text-muted-foreground" />
					<input
						type="text"
						value={rule.tag}
						placeholder={m.settings_magic_tags_tag_placeholder()}
						oninput={(e) => updateRule(i, 'tag', e.currentTarget.value)}
						class={inputClass}
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						class="shrink-0 text-muted-foreground hover:text-destructive"
						onclick={() => removeRule(i)}
					>
						<Trash2Icon size="14" />
					</Button>
				</div>

				{#if rule.pattern}
					<p class="mt-2 border-t pt-2 pl-0.5 font-mono text-xs text-muted-foreground">
						{ex.before}<span class="rounded bg-primary/15 px-1 py-0.5 text-primary">{rule.pattern}</span
						>{ex.after}
					</p>
				{/if}
			</div>
		{/each}

		<Button
			variant="outline"
			size="sm"
			onclick={addRule}
			class="w-full border-dashed text-muted-foreground"
		>
			<PlusIcon size="14" />
			{m.settings_magic_tags_add()}
		</Button>
</SettingsSection>
