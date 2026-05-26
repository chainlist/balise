<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { MarkMode } from '$lib/utils/cm';
	import type { Theme } from '$lib/services/theme.svelte';
	import { settingsService } from '$lib/services/settings.svelte';
	import { themeService } from '$lib/services/theme.svelte';
	import { setLocale } from '$paraglide/runtime.js';
	import * as m from '$paraglide/messages.js';
	import { cn } from '$lib/utils.js';
	import { Sun, Moon, Monitor, Eye, EyeOff, Pencil } from '@lucide/svelte';
	import Button from '$lib/components/shadcn/button/button.svelte';
	import { uiState } from '$lib/services/ui-state.svelte';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { getBaseDir } from '$lib/services/desk';

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

	const langs = [
		{ code: 'en' as const, label: 'English', flag: '🇬🇧' },
		{ code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
		{ code: 'es' as const, label: 'Español', flag: '🇪🇸' }
	];

	const markOptions = $derived([
		{
			value: 'always' as MarkMode,
			label: m.wizard_marks_always_label(),
			desc: m.wizard_marks_always_desc(),
			Icon: Eye
		},
		{
			value: 'cursor' as MarkMode,
			label: m.wizard_marks_cursor_label(),
			desc: m.wizard_marks_cursor_desc(),
			Icon: Pencil
		},
		{
			value: 'never' as MarkMode,
			label: m.wizard_marks_never_label(),
			desc: m.wizard_marks_never_desc(),
			Icon: EyeOff
		}
	]);

	const themeOptions = $derived([
		{ value: 'light' as Theme, label: m.wizard_theme_light_label(), Icon: Sun },
		{ value: 'system' as Theme, label: m.wizard_theme_system_label(), Icon: Monitor },
		{ value: 'dark' as Theme, label: m.wizard_theme_dark_label(), Icon: Moon }
	]);

	const welcomeFeatures = $derived([
		m.wizard_welcome_desc_1(),
		m.wizard_welcome_desc_2(),
		m.wizard_welcome_desc_3()
	]);

	function selectLang(code: 'en' | 'fr' | 'es') {
		selectedLang = code;
		setLocale(code, { reload: false });
	}

	function selectTheme(theme: Theme) {
		selectedTheme = theme;
		themeService.setTheme(theme);
	}

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
							<!-- Step 1: Language -->
							{#if step === 1}
								{#key selectedLang}
									<h2 class="text-xl font-semibold">{m.wizard_lang_title()}</h2>
									<p class="mt-1 text-sm text-muted-foreground">{m.wizard_lang_subtitle()}</p>
									<div class="mt-6 flex flex-col gap-2">
										{#each langs as lang (lang.code)}
											<button
												class={cn(
													'flex items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors',
													selectedLang === lang.code
														? 'border-foreground bg-foreground/5 font-medium'
														: 'border-border hover:bg-muted/50'
												)}
												onclick={() => selectLang(lang.code)}
											>
												<span class="text-lg">{lang.flag}</span>
												<span>{lang.label}</span>
											</button>
										{/each}
									</div>
								{/key}

								<!-- Step 2: Welcome -->
							{:else if step === 2}
								{#key selectedLang}
									<h2 class="text-xl font-semibold">{m.wizard_welcome_title()}</h2>
									<p class="mt-1 text-sm text-muted-foreground">{m.wizard_welcome_subtitle()}</p>
									<ul class="mt-6 flex flex-col gap-3">
										{#each welcomeFeatures as desc, i (i)}
											<li class="flex items-start gap-3 text-sm">
												<span
													class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold"
													>✓</span
												>
												<span>
													{desc}
													{#if i === 2 && baseDir}
														<span class="mt-1 block font-mono text-xs text-muted-foreground"
															>{baseDir}</span
														>
													{/if}
												</span>
											</li>
										{/each}
									</ul>
								{/key}

								<!-- Step 3: MarkMode -->
							{:else if step === 3}
								{#key selectedMarkMode}
									<h2 class="text-xl font-semibold">{m.wizard_marks_title()}</h2>
									<p class="mt-1 text-sm text-muted-foreground">{m.wizard_marks_subtitle()}</p>
									<div class="mt-6 flex flex-col gap-2">
										{#each markOptions as opt (opt.value)}
											{@const Icon = opt.Icon}
											<button
												class={cn(
													'flex items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors',
													selectedMarkMode === opt.value
														? 'border-foreground bg-foreground/5'
														: 'border-border hover:bg-muted/50'
												)}
												onclick={() => {
													selectedMarkMode = opt.value;
												}}
											>
												<Icon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
												<div>
													<div class="text-sm font-medium">{opt.label}</div>
													<div class="mt-0.5 text-xs text-muted-foreground">{opt.desc}</div>
												</div>
											</button>
										{/each}
									</div>
								{/key}

								<!-- Step 4: Theme -->
							{:else if step === 4}
								{#key selectedLang}
									<h2 class="text-xl font-semibold">{m.wizard_theme_title()}</h2>
									<p class="mt-1 text-sm text-muted-foreground">{m.wizard_theme_subtitle()}</p>
									<div class="mt-6 grid grid-cols-3 gap-3">
										{#each themeOptions as opt (opt.value)}
											{@const Icon = opt.Icon}
											<button
												class={cn(
													'flex flex-col items-center gap-2 rounded-md border px-3 py-4 transition-colors',
													selectedTheme === opt.value
														? 'border-foreground bg-foreground/5'
														: 'border-border hover:bg-muted/50'
												)}
												onclick={() => selectTheme(opt.value)}
											>
												<Icon class="h-5 w-5 text-muted-foreground" />
												<span class="text-sm">{opt.label}</span>
											</button>
										{/each}
									</div>
								{/key}

								<!-- Step 5: Done -->
							{:else if step === 5}
								{#key selectedLang}
									<div class="py-4 text-center">
										<div class="mb-4 text-5xl">🎉</div>
										<h2 class="text-xl font-semibold">{m.wizard_done_title()}</h2>
										<p class="mt-2 text-sm text-muted-foreground">{m.wizard_done_subtitle()}</p>
									</div>
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
