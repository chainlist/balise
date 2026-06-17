<script lang="ts">
	import './layout.css';
	import { Toaster } from '$lib/components/shadcn/sonner';
	import { themeService } from '$lib/services/app/theme.svelte';
	let { children } = $props();
</script>

<Toaster
	richColors
	closeButton
	position="top-right"
	theme={themeService.isDark ? 'dark' : 'light'}
	toastOptions={{
		classes: {
			closeButton: 'left-auto! right-0! transform-[translate(35%,-35%)]!'
		}
	}}
/>
{@render children()}
