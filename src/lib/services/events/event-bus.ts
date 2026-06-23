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
	readonly created = new Signal();
	/** A desk was renamed (payload: old then new name), so sync settings can carry
	 *  a desk's share choice across the rename. Subscriber wired by Concept 07
	 *  (Settings); until then nothing listens. */
	readonly renamed = new Signal<[oldName: string, newName: string]>();
	/** A desk was removed from the list, so sync settings can forget its stale
	 *  share entry. Subscriber wired by Concept 07 (Settings). */
	readonly removed = new Signal<[name: string]>();
}

class JournalEvents {
	/** A "go to date" jump occurred (payload is the `YYYY-MM-DD` key), so the
	 *  matching day can expand itself if it was collapsed. */
	readonly jumpedTo = new Signal<[key: string]>();
}

class EventBus {
	readonly notes = new NoteEvents();
	readonly sync = new SyncEvents();
	readonly desks = new DeskEvents();
	readonly journal = new JournalEvents();
}

export const eventBus = new EventBus();
