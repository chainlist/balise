import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getDB } from '$lib/utils/db';
import { getDeviceId } from '$lib/utils/device-id';
import { syncOpen, syncSend, syncRecv, syncClose } from '$lib/utils/sync';
import { notesToSend, incomingWins } from '$lib/utils/sync-reconcile';
import { notesService } from '$lib/services/notes.svelte';
import { tagsService } from '$lib/services/tags.svelte';
import { devicesService } from '$lib/services/devices.svelte';
import { settingsService } from '$lib/services/settings.svelte';
import { fsService } from '$lib/services/fs';
import { noteSignals } from '$lib/services/note-signals';
import { writeNoteFile, deleteNoteFile } from '$lib/repositories/notes.fs.repo';
import {
	queryManifest,
	querySyncNotes,
	queryClock,
	queryNoteById,
	insertDeletion,
	clearDeletion,
	deleteNoteById
} from '$lib/repositories/notes.repo';
import type { SyncedNote } from '$lib/models/sync';

/** `sync-session` event payload emitted by the backend for an incoming stream. */
interface SyncSessionOpened {
	sessionId: string;
	deviceId: string;
}

/**
 * Drives device-to-device note sync over the iroh transport. Runs a manifest
 * exchange on a timer (dialer side) and answers incoming sessions (accept side),
 * reconciling with last-write-wins. The networking layer itself is started and
 * stopped separately via startSync/stopSync.
 */
class DeviceSyncService {
	syncing = $state(false);

	#interval: ReturnType<typeof setInterval> | null = null;
	#unlisten: UnlistenFn | null = null;
	#deviceId: string | null = null;
	/** Guards against overlapping cycles (a slow peer outliving the interval). */
	#running = false;

	/** Registers the accept-side listener once; safe to call on every launch. */
	async init(): Promise<void> {
		if (this.#unlisten) return;
		this.#unlisten = await listen<SyncSessionOpened>('sync-session', (event) => {
			void this.#handleIncoming(event.payload);
		});
	}

	/** Begins periodic sync. Runs one cycle immediately, then every interval. */
	startInterval(): void {
		if (this.#interval) return;
		void this.syncAll();
		this.#interval = setInterval(() => void this.syncAll(), this.#intervalMs());
	}

	stopInterval(): void {
		if (this.#interval) {
			clearInterval(this.#interval);
			this.#interval = null;
		}
	}

	/** Picks up a changed interval setting without forcing an immediate sync. */
	reschedule(): void {
		if (!this.#interval) return;
		clearInterval(this.#interval);
		this.#interval = setInterval(() => void this.syncAll(), this.#intervalMs());
	}

	#intervalMs(): number {
		return Math.max(1, settingsService.sync.intervalMinutes) * 60_000;
	}

	/** Dials every linked device in turn. One peer's failure can't abort the rest. */
	async syncAll(): Promise<void> {
		if (this.#running) return;
		// Sync currently covers only the active desk's DB; when it's unshared this
		// device neither pushes nor pulls it. A future multi-desk loop will apply
		// the same isDeskShared gate per desk.
		if (!settingsService.isDeskShared(fsService.currentDesk)) return;
		this.#running = true;
		this.syncing = true;
		try {
			for (const device of devicesService.linked) {
				try {
					const sessionId = await syncOpen(device.id);
					await this.#runProtocol(sessionId, device.id);
				} catch (e) {
					// Best-effort: a peer that's offline or unreachable is expected and
					// must not spam the user with a toast every cycle.
					console.warn(`sync with ${device.id} failed:`, e);
				}
			}
		} finally {
			this.#running = false;
			this.syncing = false;
		}
	}

	/**
	 * Accept side: only talk to paired peers, and only while the active desk (the
	 * one this session would reconcile) is shared. Drop the stream otherwise.
	 */
	async #handleIncoming({ sessionId, deviceId }: SyncSessionOpened): Promise<void> {
		const paired = devicesService.linked.some((d) => d.id === deviceId);
		if (!paired || !settingsService.isDeskShared(fsService.currentDesk)) {
			void syncClose(sessionId);
			return;
		}
		try {
			await this.#runProtocol(sessionId, deviceId);
		} catch (e) {
			console.warn(`incoming sync from ${deviceId} failed:`, e);
		}
	}

	/**
	 * One full exchange on a session: swap manifests, then swap the note bodies
	 * each side wins. Send and receive run concurrently so neither stalls on the
	 * other's flow control. Symmetric, so both peers run this same routine.
	 */
	async #runProtocol(sessionId: string, remoteDeviceId: string): Promise<void> {
		try {
			const localDeviceId = await this.#localDeviceId();
			const db = getDB();
			const localManifest = await queryManifest(db);

			const [, manifestMsg] = await Promise.all([
				syncSend(sessionId, { type: 'manifest', entries: localManifest }),
				syncRecv(sessionId)
			]);
			if (manifestMsg.type !== 'manifest') throw new Error('expected manifest');

			const sendIds = notesToSend(
				localManifest,
				manifestMsg.entries,
				localDeviceId,
				remoteDeviceId
			);
			const payload = await querySyncNotes(db, sendIds);

			const [, notesMsg] = await Promise.all([
				syncSend(sessionId, { type: 'notes', notes: payload }),
				syncRecv(sessionId)
			]);
			if (notesMsg.type !== 'notes') throw new Error('expected notes');

			await this.#applyIncoming(notesMsg.notes, remoteDeviceId, localDeviceId);
			this.#touchDevice(remoteDeviceId);
		} finally {
			void syncClose(sessionId);
		}
	}

	/** Applies received bodies under the same LWW guard used to select them. */
	async #applyIncoming(
		notes: SyncedNote[],
		remoteDeviceId: string,
		localDeviceId: string
	): Promise<void> {
		const db = getDB();
		let changed = 0;

		for (const note of notes) {
			const local = await queryClock(db, note.id);
			if (local && !incomingWins(note.updatedAt, local.updatedAt, remoteDeviceId, localDeviceId)) {
				continue;
			}

			if (note.deleted) {
				// Preserve the peer's deletion time as the tombstone's clock.
				await insertDeletion(db, note.id, note.updatedAt);
				if (!local?.deleted) {
					await deleteNoteById(db, note.id);
					await deleteNoteFile(note.id);
				}
			} else {
				const exists = local !== null && !local.deleted;
				await clearDeletion(db, note.id); // in case the peer re-created a deleted note
				await notesService.importNote(note.id, note.content, {
					create: !exists,
					pinned: note.pinned,
					archived: note.archived,
					createdAt: note.createdAt,
					updatedAt: note.updatedAt
				});
				const saved = await queryNoteById(db, note.id);
				if (saved) await writeNoteFile({ ...saved, content: note.content });
			}
			changed++;
		}

		if (changed > 0) {
			await tagsService.load();
			noteSignals.signalNotesSynced();
		}
	}

	#touchDevice(deviceId: string): void {
		const device = devicesService.linked.find((d) => d.id === deviceId);
		if (device) devicesService.upsert({ ...device, lastSeen: Date.now() });
	}

	async #localDeviceId(): Promise<string> {
		if (!this.#deviceId) this.#deviceId = await getDeviceId();
		return this.#deviceId;
	}
}

export const deviceSyncService = new DeviceSyncService();
