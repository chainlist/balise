<script lang="ts">
	import {
		BrushIcon,
		SquareIcon,
		CircleIcon,
		TriangleIcon,
		DiamondIcon,
		StarIcon,
		HeartIcon,
		MoveUpRightIcon,
		MinusIcon
	} from '@lucide/svelte';
	import * as Select from '$lib/components/shadcn/select';
	import { drawingsService } from '$lib/services/drawings.svelte';
	import { SHAPE_KINDS, type ShapeKind } from '$lib/domain/shape';
	import * as m from '$paraglide/messages.js';

	const ICONS = {
		brush: BrushIcon,
		square: SquareIcon,
		circle: CircleIcon,
		triangle: TriangleIcon,
		diamond: DiamondIcon,
		star: StarIcon,
		heart: HeartIcon,
		arrow: MoveUpRightIcon,
		line: MinusIcon
	} as const;

	const SHAPE_LABELS: Record<ShapeKind, () => string> = {
		square: m.editor_draw_shape_square,
		circle: m.editor_draw_shape_circle,
		triangle: m.editor_draw_shape_triangle,
		diamond: m.editor_draw_shape_diamond,
		star: m.editor_draw_shape_star,
		heart: m.editor_draw_shape_heart,
		arrow: m.editor_draw_shape_arrow,
		line: m.editor_draw_shape_line
	};

	const value = $derived(drawingsService.tool === 'shape' ? drawingsService.shape : 'brush');
	const Icon = $derived(ICONS[value]);

	function onValueChange(v: string) {
		if (!v) return;
		if (v === 'brush') {
			drawingsService.tool = 'brush';
		} else {
			drawingsService.shape = v as ShapeKind;
			drawingsService.tool = 'shape';
		}
	}
</script>

<!-- Tool select: the brush, or one of the predefined shapes to drag out. -->
<Select.Root type="single" {value} {onValueChange}>
	<Select.Trigger
		aria-label={m.editor_draw_shape()}
		class="h-6 w-auto gap-0.5 rounded-full border-none bg-transparent px-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
	>
		<Icon class="size-4" />
	</Select.Trigger>
	<Select.Content>
		<Select.Item value="brush" label={m.editor_draw_brush()}>
			<BrushIcon class="size-4 text-muted-foreground" />
			{m.editor_draw_brush()}
		</Select.Item>
		{#each SHAPE_KINDS as kind (kind)}
			{@const KindIcon = ICONS[kind]}
			<Select.Item value={kind} label={SHAPE_LABELS[kind]()}>
				<KindIcon class="size-4 text-muted-foreground" />
				{SHAPE_LABELS[kind]()}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
