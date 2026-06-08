<script lang="ts">
	import {
		settingsService,
		MAGIC_TAG_MATCH_TYPES,
		type MagicTag,
		type MagicTagMatchType
	} from '$lib/services/settings.svelte';
	import { PlusIcon, Trash2Icon } from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import * as Select from '$lib/components/shadcn/select/index.js';

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

	let rules = $state(settingsService.magicTags.map((r) => ({ ...r })));

	function save() {
		settingsService.setMagicTags(rules.map((r) => ({ ...r })));
	}

	function addRule() {
		rules = [...rules, { pattern: '', matchType: MAGIC_TAG_MATCH_TYPES.CONTAINS, tag: '' }];
		save();
	}

	function removeRule(index: number) {
		rules = rules.filter((_, i) => i !== index);
		save();
	}

	function updateRule(index: number, field: keyof MagicTag, value: string) {
		rules = rules.map((r, i) => (i === index ? { ...r, [field]: value } : r));
		save();
	}

	const inputClass =
		'rounded-md border border-input bg-background px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary';
</script>

<div class="flex h-full flex-col">
	<div class="border-b px-6 py-4">
		<h2 class="text-base font-semibold">{m.settings_magic_tags_heading()}</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">{m.settings_magic_tags_description()}</p>
	</div>

	<div class="flex-1 space-y-4 overflow-y-auto px-6 py-6">
		{#each rules as rule, i (i)}
			{@const ex = buildExample(rule.matchType)}
			<div class="space-y-1.5">
				<div class="flex items-center gap-2">
					<Select.Root
						type="single"
						value={rule.matchType}
						onValueChange={(v) => v && updateRule(i, 'matchType', v)}
					>
						<Select.Trigger class="w-36 shrink-0">
							<Select.Value />
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
						class="{inputClass} flex-1"
					/>
					<span class="text-xs text-muted-foreground">→</span>
					<input
						type="text"
						value={rule.tag}
						placeholder={m.settings_magic_tags_tag_placeholder()}
						oninput={(e) => updateRule(i, 'tag', e.currentTarget.value)}
						class="{inputClass} flex-1"
					/>
					<button
						onclick={() => removeRule(i)}
						class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<Trash2Icon size="14" />
					</button>
				</div>

				{#if rule.pattern}
					<p class="pl-1 font-mono text-xs text-muted-foreground">
						{ex.before}<span class="rounded bg-primary/15 px-0.5 text-primary">{rule.pattern}</span
						>{ex.after}
					</p>
				{/if}
			</div>
		{/each}

		<button
			onclick={addRule}
			class="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
		>
			<PlusIcon size="14" />
			{m.settings_magic_tags_add()}
		</button>
	</div>
</div>
