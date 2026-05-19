<script lang="ts">
	import { editorState, setFontSize } from '$lib/services/editor.svelte';

	const MIN = 12;
	const MAX = 24;
</script>

<div class="flex flex-col h-full">
	<div class="px-6 py-4 border-b">
		<h2 class="text-base font-semibold">Editor</h2>
		<p class="text-sm text-muted-foreground mt-0.5">Customize the writing experience.</p>
	</div>

	<div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<p class="text-sm font-medium">Font size</p>
					<p class="text-xs text-muted-foreground">Size of text in the editor.</p>
				</div>
				<span class="text-sm font-mono tabular-nums text-muted-foreground w-12 text-right">
					{editorState.fontSize}px
				</span>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-xs text-muted-foreground w-6 text-right">{MIN}</span>
				<input
					type="range"
					min={MIN}
					max={MAX}
					step="1"
					value={editorState.fontSize}
					oninput={(e) => setFontSize(Number(e.currentTarget.value))}
					class="flex-1 accent-primary"
				/>
				<span class="text-xs text-muted-foreground w-6">{MAX}</span>
			</div>
		</div>
	</div>
</div>
