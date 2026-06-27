<script lang="ts">
	import {
		Info,
		Lightbulb,
		MessageSquareWarning,
		TriangleAlert,
		OctagonAlert
	} from '@lucide/svelte';
	import * as m from '$paraglide/messages.js';
	import type { SignalType } from '$lib/utils/markdown-patterns';

	let { type }: { type: SignalType } = $props();

	const CONFIG = {
		note: { icon: Info, label: m.slash_signal_note_label },
		tip: { icon: Lightbulb, label: m.slash_signal_tip_label },
		important: { icon: MessageSquareWarning, label: m.slash_signal_important_label },
		warning: { icon: TriangleAlert, label: m.slash_signal_warning_label },
		caution: { icon: OctagonAlert, label: m.slash_signal_caution_label }
	} as const;

	const Icon = $derived(CONFIG[type].icon);
	const label = $derived(CONFIG[type].label());
</script>

<span class="signal-header">
	<span>{label}</span>
	<Icon size={16} strokeWidth={2.25} aria-hidden="true" />
</span>

<style>
	.signal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		box-sizing: border-box;
		padding-right: 0.4rem;
		/* --signal-color is set on the enclosing signal line (see cm theme). */
		color: var(--signal-color);
		font-weight: 600;
		user-select: none;
	}
</style>
