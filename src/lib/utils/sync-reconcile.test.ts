import { describe, it, expect } from 'vitest';
import { notesToSend, incomingWins } from './sync-reconcile';
import type { ManifestEntry } from '$lib/models/sync';

const entry = (id: string, updatedAt: string, deleted = false): ManifestEntry => ({
	id,
	updatedAt,
	deleted
});

// localDeviceId 'b' > remoteDeviceId 'a', so local wins exact ties.
const send = (local: ManifestEntry[], remote: ManifestEntry[]) =>
	notesToSend(local, remote, 'b', 'a');

describe('notesToSend', () => {
	it('sends ids the peer has never seen', () => {
		const local = [entry('1', '2026-06-13 12:00:00')];
		expect(send(local, [])).toEqual(['1']);
	});

	it('sends when the local version is newer', () => {
		const local = [entry('1', '2026-06-13 12:00:05')];
		const remote = [entry('1', '2026-06-13 12:00:00')];
		expect(send(local, remote)).toEqual(['1']);
	});

	it('does not send when the peer version is newer', () => {
		const local = [entry('1', '2026-06-13 12:00:00')];
		const remote = [entry('1', '2026-06-13 12:00:05')];
		expect(send(local, remote)).toEqual([]);
	});

	it('breaks exact-timestamp ties in favour of the higher device id', () => {
		const local = [entry('1', '2026-06-13 12:00:00')];
		const remote = [entry('1', '2026-06-13 12:00:00')];
		// local id 'b' > remote id 'a' -> local wins and sends
		expect(notesToSend(local, remote, 'b', 'a')).toEqual(['1']);
		// swapped: local id 'a' < remote id 'b' -> local loses and stays silent
		expect(notesToSend(local, remote, 'a', 'b')).toEqual([]);
	});

	it('compares by parsed time, not string order, across mixed timestamp forms', () => {
		// SQLite form is one second LATER than the ISO form, but ' ' (0x20) sorts
		// before 'T' (0x54), so a naive string compare would wrongly call it older.
		const local = [entry('1', '2026-06-13 12:00:01')];
		const remote = [entry('1', '2026-06-13T12:00:00.000Z')];
		expect(send(local, remote)).toEqual(['1']);
	});

	it('treats a tombstone like any other entry via its timestamp', () => {
		// Local deletion is newer than the peer's live copy -> propagate the delete.
		const local = [entry('1', '2026-06-13 12:00:05', true)];
		const remote = [entry('1', '2026-06-13 12:00:00')];
		expect(send(local, remote)).toEqual(['1']);
	});

	it('does not resurrect: a stale local copy loses to a newer remote tombstone', () => {
		const local = [entry('1', '2026-06-13 12:00:00')];
		const remote = [entry('1', '2026-06-13 12:00:05', true)];
		expect(send(local, remote)).toEqual([]);
	});
});

describe('incomingWins', () => {
	it('applies a strictly newer incoming note', () => {
		expect(incomingWins('2026-06-13 12:00:05', '2026-06-13 12:00:00', 'a', 'b')).toBe(true);
	});

	it('rejects an older incoming note', () => {
		expect(incomingWins('2026-06-13 12:00:00', '2026-06-13 12:00:05', 'b', 'a')).toBe(false);
	});

	it('breaks exact ties toward the higher device id (incoming is remote)', () => {
		expect(incomingWins('2026-06-13 12:00:00', '2026-06-13 12:00:00', 'b', 'a')).toBe(true);
		expect(incomingWins('2026-06-13 12:00:00', '2026-06-13 12:00:00', 'a', 'b')).toBe(false);
	});

	it('compares parsed time across mixed timestamp forms', () => {
		expect(incomingWins('2026-06-13 12:00:01', '2026-06-13T12:00:00.000Z', 'a', 'b')).toBe(true);
	});
});
