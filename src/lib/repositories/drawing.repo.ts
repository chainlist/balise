import { getDb } from './backend/db';
import type { Drawing, Stroke, StrokePoint } from '$lib/domain/drawing';

// Data access for note drawings. `note_drawings` rows are deleted with their
// note via the FOREIGN KEY ... ON DELETE CASCADE in migration 4.

interface RawDrawingRow {
	id: string;
	color: string;
	x: number;
	y: number;
	strokes: string;
}

export const drawingRepo = {
	async findByNote(noteId: string): Promise<Drawing[]> {
		const rows = await getDb().select<RawDrawingRow[]>(
			'SELECT id, color, x, y, strokes FROM note_drawings WHERE note_id = $1 ORDER BY created_at ASC',
			[noteId]
		);
		return rows.map((r) => ({
			id: r.id,
			color: r.color,
			x: r.x,
			y: r.y,
			// Rows written before strokes carried a width stored bare point arrays;
			// wrap them with the then-fixed brush size.
			strokes: (JSON.parse(r.strokes) as (Stroke | StrokePoint[])[]).map((s) =>
				Array.isArray(s) ? { size: 6, points: s } : s
			)
		}));
	},

	/** Replace the note's whole drawing set — a draw session commits atomically. */
	async replaceForNote(noteId: string, drawings: Drawing[]): Promise<void> {
		const db = getDb();
		await db.execute('DELETE FROM note_drawings WHERE note_id = $1', [noteId]);
		for (const d of drawings) {
			await db.execute(
				`INSERT INTO note_drawings (id, note_id, color, x, y, strokes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
				[d.id, noteId, d.color, d.x, d.y, JSON.stringify(d.strokes)]
			);
		}
	}
};
