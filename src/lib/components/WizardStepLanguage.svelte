<script lang="ts">
	import { setLocale } from '$paraglide/runtime.js';
	import { cn } from '$lib/utils.js';
	import * as m from '$paraglide/messages.js';

	let { selectedLang = $bindable<'en' | 'fr' | 'es'>() } = $props();

	const langs = [
		{ code: 'en' as const, label: 'English', flag: '🇬🇧' },
		{ code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
		{ code: 'es' as const, label: 'Español', flag: '🇪🇸' }
	];

	function selectLang(code: 'en' | 'fr' | 'es') {
		selectedLang = code;
		setLocale(code, { reload: false });
	}
</script>

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
