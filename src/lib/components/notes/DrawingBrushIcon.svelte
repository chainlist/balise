<script lang="ts">
	// A filled, Miro-style paintbrush pointing up: bristle tip tinted with the
	// active brush color, metal ferrule, handle meant to run off the page edge.
	let { color, class: className = '' }: { color: string; class?: string } = $props();
</script>

<svg viewBox="0 0 28 56" class={className} aria-hidden="true">
	<!-- bristles -->
	<path d="M14 1 C10.5 5.5 7.5 11 7.5 18.5 L20.5 18.5 C20.5 11 17.5 5.5 14 1 Z" fill={color} />
	<!-- ferrule -->
	<rect x="6.5" y="18.5" width="15" height="8" rx="1.5" fill="var(--muted-foreground)" />
	<rect x="6.5" y="21" width="15" height="1.2" fill="var(--background)" opacity="0.35" />
	<rect x="6.5" y="23.5" width="15" height="1.2" fill="var(--background)" opacity="0.35" />
	<!-- handle -->
	<path d="M9 26.5 H19 L18 56 H10 Z" fill="var(--foreground)" opacity="0.85" />
</svg>
