import { Signal } from './signal';

/**
 * App-wide event bus. Channels exist to invert dependencies: a low-level
 * producer announces that something happened, and a higher-level consumer opts
 * in, without the producer importing the consumer (which would be a cycle, e.g.
 * `notesService` could never import `uiState`). Channels are grouped by domain.
 */

class NoteEvents {
	/** Select / navigate to a note (a command from shortcuts or the palette). */
	readonly select = new Signal<[id: string]>();
	/** The user asked to delete a note; opens the confirm dialog (the intent,
	 *  not the {@link deleted} fact). */
	readonly deleteRequested = new Signal<[id: string]>();
	/** A note was actually deleted, so per-note local state like remembered
	 *  folds can be pruned. */
	readonly deleted = new Signal<[id: string]>();
}

class SyncEvents {
	/** A user-initiated note write happened, so device sync can schedule a push.
	 *  Never emitted by the sync-apply path, which would loop. */
	readonly localChange = new Signal();
	/** Device sync applied remote changes, so the view can reload. */
	readonly synced = new Signal();
}

class DeskEvents {
	/** Device sync created a desk that wasn't here before, so the desk list can
	 *  pick it up. */
	readonly changed = new Signal();
}

class EventBus {
	readonly notes = new NoteEvents();
	readonly sync = new SyncEvents();
	readonly desks = new DeskEvents();
}

export const eventBus = new EventBus();
