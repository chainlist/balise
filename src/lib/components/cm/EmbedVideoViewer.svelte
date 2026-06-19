<script lang="ts">
	let { raw, transformed }: { raw: string; transformed: string } = $props();
</script>

<div class="grid w-full place-items-center py-2">
	<div class="aspect-video w-full max-w-2xl overflow-hidden rounded">
		<iframe
			class="h-full w-full border-0"
			src={transformed}
			title={raw}
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			allowfullscreen
		></iframe>
	</div>
</div>
