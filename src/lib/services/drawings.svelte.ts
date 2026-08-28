import { drawingRepo } from '$lib/repositories/drawing.repo';
import {
	createDrawing,
	withStroke,
	strokeJoinsDrawing,
	eraseAt,
	type Drawing,
	type StrokePoint
} from '$lib/domain/drawing';
import { COLOR_PALETTE } from '$lib/utils/color-palette';

export type DrawingTool = 'brush' | 'eraser';

// Application layer: the draw-mode session for the open note. `drawings` is the
// committed set loaded from the repo; entering draw mode copies it into
// `working`, strokes / moves / deletes / erases apply to the copy, `commit`
// persists it and `cancel` (Escape) throws it away. Every mutation snapshots the
// previous working set for Ctrl+Z / Ctrl+Y; drag-style gestures (move, erase)
// arm a pending snapshot on gesture start and consume it on the first actual
// change, so a no-op gesture leaves no history entry.
class DrawingsService {
	#noteId: string | null = null;
	#history: Drawing[][] = [];
	#future: Drawing[][] = [];
	#pending: Drawing[] | null = null;
	drawings = $state<Drawing[]>([]);
	working = $state<Drawing[]>([]);
	active = $state(false);
	color = $state(COLOR_PALETTE[0]);
	tool = $state<DrawingTool>('brush');
	width = $state(7);

	async load(noteId: string): Promise<void> {
		this.#noteId = noteId;
		this.active = false;
		this.working = [];
		this.drawings = await drawingRepo.findByNote(noteId);
	}

	start(): void {
		this.working = structuredClone($state.snapshot(this.drawings));
		this.#history = [];
		this.#future = [];
		this.#pending = null;
		this.tool = 'brush';
		this.active = true;
	}

	cancel(): void {
		this.active = false;
		this.working = [];
	}

	#push(snapshot: Drawing[]): void {
		this.#history.push(snapshot);
		this.#future = [];
	}

	undo(): void {
		const prev = this.#history.pop();
		if (!prev) return;
		this.#future.push($state.snapshot(this.working));
		this.working = prev;
	}

	redo(): void {
		const next = this.#future.pop();
		if (!next) return;
		this.#history.push($state.snapshot(this.working));
		this.working = next;
	}

	/** Append a finished stroke: it joins a nearby drawing, else starts a new one. */
	addStroke(points: StrokePoint[]): void {
		this.#push($state.snapshot(this.working));
		const stroke = { size: this.width, color: this.color, points };
		const target = this.working.find((d) => strokeJoinsDrawing(d, points));
		if (target) {
			this.working = this.working.map((d) => (d === target ? withStroke(d, stroke) : d));
		} else {
			this.working = [...this.working, createDrawing(stroke, this.color)];
		}
	}

	/** Arm the history snapshot for a drag gesture (move or erase). */
	startGesture(): void {
		this.#pending = $state.snapshot(this.working);
	}

	#consumePending(): void {
		if (!this.#pending) return;
		this.#push(this.#pending);
		this.#pending = null;
	}

	move(id: string, dx: number, dy: number): void {
		this.#consumePending();
		this.working = this.working.map((d) => (d.id === id ? { ...d, x: d.x + dx, y: d.y + dy } : d));
	}

	erase(point: { x: number; y: number }): void {
		const next = eraseAt(this.working, point, this.width + 4);
		if (next === this.working) return;
		this.#consumePending();
		this.working = next;
	}

	remove(id: string): void {
		this.#push($state.snapshot(this.working));
		this.working = this.working.filter((d) => d.id !== id);
	}

	async commit(): Promise<void> {
		if (!this.#noteId) return;
		const drawings = $state.snapshot(this.working);
		await drawingRepo.replaceForNote(this.#noteId, drawings);
		this.drawings = drawings;
		this.active = false;
		this.working = [];
	}
}

export const drawingsService = new DrawingsService();
