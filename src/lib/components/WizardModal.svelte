<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { MarkMode } from '$lib/utils/cm';
	import type { Theme } from '$lib/services/theme.svelte';
	import { settingsService } from '$lib/services/settings.svelte';
	import * as m from '$paraglide/messages.js';
	import { cn } from '$lib/utils.js';
	import Button from '$lib/components/shadcn/button/button.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { getBaseDir } from '$lib/services/desk';
	import WizardStepLanguage from './WizardStepLanguage.svelte';
	import WizardStepWelcome from './WizardStepWelcome.svelte';
	import WizardStepMarks from './WizardStepMarks.svelte';
	import WizardStepTheme from './WizardStepTheme.svelte';
	import WizardStepDone from './WizardStepDone.svelte';

	const STORAGE_KEY = 'balise_onboarding_done';
	const TOTAL_STEPS = 5;

	let step = $state(1);
	let selectedLang = $state<'en' | 'fr' | 'es'>(settingsService.language);
	let selectedMarkMode = $state<MarkMode>(settingsService.markdownMarks);
	let selectedTheme = $state<Theme>(settingsService.theme);
	let baseDir = $state('');

	onMount(async () => {
		baseDir = await getBaseDir();
	});

	async function finish() {
		localStorage.setItem(STORAGE_KEY, 'true');
		settingsService.setMarkdownMarks(selectedMarkMode);
		if (selectedLang !== settingsService.language) {
			await settingsService.setLanguage(selectedLang);
		} else {
			uiState.isWizardOpen = false;
		}
	}
</script>

<DialogPrimitive.Root open={uiState.isWizardOpen} onOpenChange={(v) => (uiState.isWizardOpen = v)}>
	<DialogPrimitive.Portal>
		<DialogPrimitive.Overlay
			class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
		/>
		<DialogPrimitive.Content
			escapeKeydownBehavior="ignore"
			interactOutsideBehavior="ignore"
			class={cn(
				'fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-popover text-popover-foreground shadow-lg outline-none',
				'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
				'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
			)}
		>
			<!-- Progress dots -->
			<div class="flex justify-center gap-2 px-8 pt-6">
				{#each Array.from({ length: TOTAL_STEPS }, (_, i) => i) as i (i)}
					<div
						class={cn(
							'h-1.5 rounded-full transition-all duration-300',
							step === i + 1 ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground/30'
						)}
					></div>
				{/each}
			</div>

			<div class="flex flex-col p-8 pt-6">
				<div class="relative grid">
					{#key step}
						<div
							class="[grid-area:1/1]"
							in:fade={{ duration: 150, delay: 150 }}
							out:fade={{ duration: 150 }}
						>
							{#if step === 1}
								{#key selectedLang}
									<WizardStepLanguage bind:selectedLang />
								{/key}
							{:else if step === 2}
								{#key selectedLang}
									<WizardStepWelcome {baseDir} />
								{/key}
							{:else if step === 3}
								{#key selectedMarkMode}
									<WizardStepMarks bind:selectedMarkMode />
								{/key}
							{:else if step === 4}
								{#key selectedLang}
									<WizardStepTheme bind:selectedTheme />
								{/key}
							{:else if step === 5}
								{#key selectedLang}
									<WizardStepDone />
								{/key}
							{/if}
						</div>
					{/key}
				</div>

				<!-- Navigation -->
				<div class="mt-8 flex items-center justify-between">
					<div>
						{#if step > 1 && step < 5}
							<Button variant="ghost" size="sm" onclick={() => step--}>
								{m.wizard_action_back()}
							</Button>
						{/if}
					</div>
					<div>
						{#if step < 5}
							<Button onclick={() => step++}>{m.wizard_action_next()}</Button>
						{:else}
							<Button onclick={finish}>{m.wizard_action_get_started()}</Button>
						{/if}
					</div>
				</div>
			</div>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
