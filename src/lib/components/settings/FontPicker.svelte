<script lang="ts">
	import { onMount } from 'svelte';
	import * as Popover from '$lib/components/shadcn/popover/index.js';
	import * as Command from '$lib/components/shadcn/command/index.js';
	import { listFonts } from '$lib/repositories/backend/tauri';
	import { toasterService, errorMessage } from '$lib/services/toaster';
	import { ChevronDownIcon } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';

	let { value, onValueChange }: { value: string; onValueChange: (v: string) => void } = $props();

	/** Curated editor fonts; only those actually installed on the machine appear. */
	const RECOMMENDED = [
		'JetBrains Mono',
		'Fira Code',
		'Cascadia Code',
		'Cascadia Mono',
		'Source Code Pro',
		'IBM Plex Mono',
		'Iosevka',
		'Hack',
		'Consolas',
		'SF Mono',
		'Menlo',
		'Inter',
		'Segoe UI',
		'Georgia',
		'Cambria',
		'Charter',
		'iA Writer Mono',
		'iA Writer Duo'
	];

	/** Sentinel for the "Default" entry; maps to an empty fontFamily. */
	const DEFAULT_FONT = '__default__';

	let open = $state(false);
	let loading = $state(true);
	let fonts = $state<string[]>([]);

	onMount(async () => {
		try {
			fonts = await listFonts();
		} catch (e) {
			toasterService.error(m.settings_font_family_load_error(), errorMessage(e));
		} finally {
			loading = false;
		}
	});

	const installed = $derived(new Map(fonts.map((f) => [f.toLowerCase(), f])));
	const recommended = $derived(
		RECOMMENDED.map((n) => installed.get(n.toLowerCase())).filter(
			(f): f is string => f !== undefined
		)
	);
	const recommendedSet = $derived(new Set(recommended));
	const others = $derived(fonts.filter((f) => !recommendedSet.has(f)));

	const label = $derived(value || m.settings_font_family_default());

	function select(font: string) {
		onValueChange(font === DEFAULT_FONT ? '' : font);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={cn(
			'flex h-[30px] w-48 items-center justify-between gap-2 rounded border border-input bg-surface-container-lowest px-2 py-1 text-sm',
			'focus:outline-none focus:ring-1 focus:ring-primary'
		)}
		style={value ? `font-family: "${value}"` : undefined}
	>
		<span class="min-w-0 truncate">{label}</span>
		<ChevronDownIcon size={12} class="shrink-0 text-muted-foreground" />
	</Popover.Trigger>
	<Popover.Content class="w-56 p-0" align="end">
		<Command.Root>
			<Command.Input placeholder={m.settings_font_family_search()} />
			<Command.List>
				{#if loading}
					<div class="py-6 text-center text-sm text-muted-foreground">
						{m.settings_font_family_loading()}
					</div>
				{:else}
					<Command.Empty>{m.settings_font_family_none()}</Command.Empty>
					<Command.Item
						value={m.settings_font_family_default()}
						onSelect={() => select(DEFAULT_FONT)}
					>
						{m.settings_font_family_default()}
					</Command.Item>
					{#if recommended.length > 0}
						<Command.Group heading={m.settings_font_family_recommended()}>
							{#each recommended as font (font)}
								<Command.Item
									value={font}
									onSelect={() => select(font)}
									style={`font-family: "${font}"`}
								>
									{font}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
					<Command.Group heading={m.settings_font_family_all()}>
						{#each others as font (font)}
							<Command.Item
								value={font}
								onSelect={() => select(font)}
								style={`font-family: "${font}"`}
							>
								{font}
							</Command.Item>
						{/each}
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
