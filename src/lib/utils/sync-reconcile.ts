import type { ManifestEntry } from '$lib/models/sync';
import { parseDbTimestamp } from '$lib/utils/time';

/**
 * Given my manifest and a peer's, returns the ids whose local version wins and
 * should therefore be sent to the peer. Last-write-wins on `updatedAt`; an exact
 * timestamp tie is broken deterministically by device id so both ends agree on
 * the winner. The peer runs the same function against the swapped arguments, so
 * its "to send" set is exactly what we're missing - no explicit pull list needed.
 */
export function notesToSend(
	local: ManifestEntry[],
	remote: ManifestEntry[],
	localDeviceId: string,
	remoteDeviceId: string
): string[] {
	const remoteById = new Map(remote.map((e) => [e.id, e]));
	const localWinsTies = localDeviceId > remoteDeviceId;
	const send: string[] = [];

	for (const mine of local) {
		const theirs = remoteById.get(mine.id);
		if (!theirs) {
			send.push(mine.id); // peer has never seen it
			continue;
		}
		const a = parseDbTimestamp(mine.updatedAt);
		const b = parseDbTimestamp(theirs.updatedAt);
		if (a > b || (a === b && localWinsTies)) send.push(mine.id);
	}
	return send;
}

/**
 * Apply-side guard: should an incoming note overwrite the local copy? Mirrors
 * the LWW + device-id tiebreak of [`notesToSend`], so a note re-checked here is
 * applied exactly when the sender legitimately won it.
 */
export function incomingWins(
	incomingAt: string,
	localAt: string,
	incomingDeviceId: string,
	localDeviceId: string
): boolean {
	const a = parseDbTimestamp(incomingAt);
	const b = parseDbTimestamp(localAt);
	return a > b || (a === b && incomingDeviceId > localDeviceId);
}
