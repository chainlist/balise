import { describe, it, expect, vi } from 'vitest';
import { noteSignals } from './note-signals';

describe('noteSignals.onSelectNote', () => {
	it('calls the handler when signalSelectNote fires', () => {
		const fn = vi.fn();
		noteSignals.onSelectNote(fn);
		noteSignals.signalSelectNote('id-1');
		expect(fn).toHaveBeenCalledWith('id-1');
	});

	it('does not call handler after the returned unsubscriber runs', () => {
		const fn = vi.fn();
		const unsub = noteSignals.onSelectNote(fn);
		unsub();
		noteSignals.signalSelectNote('id-1');
		expect(fn).not.toHaveBeenCalled();
	});

	it('calls all registered handlers', () => {
		const a = vi.fn();
		const b = vi.fn();
		noteSignals.onSelectNote(a);
		noteSignals.onSelectNote(b);
		noteSignals.signalSelectNote('id-2');
		expect(a).toHaveBeenCalledWith('id-2');
		expect(b).toHaveBeenCalledWith('id-2');
	});

	it('only removes the specific handler that unsubscribed', () => {
		const a = vi.fn();
		const b = vi.fn();
		const unsubA = noteSignals.onSelectNote(a);
		noteSignals.onSelectNote(b);
		unsubA();
		noteSignals.signalSelectNote('id-3');
		expect(a).not.toHaveBeenCalled();
		expect(b).toHaveBeenCalledWith('id-3');
	});
});

describe('noteSignals.onDeleteNote', () => {
	it('calls the handler when signalDeleteNote fires', () => {
		const fn = vi.fn();
		noteSignals.onDeleteNote(fn);
		noteSignals.signalDeleteNote('del-1');
		expect(fn).toHaveBeenCalledWith('del-1');
	});

	it('does not call handler after the returned unsubscriber runs', () => {
		const fn = vi.fn();
		const unsub = noteSignals.onDeleteNote(fn);
		unsub();
		noteSignals.signalDeleteNote('del-2');
		expect(fn).not.toHaveBeenCalled();
	});
});

describe('channel isolation', () => {
	it('selectNote handlers do not fire on signalDeleteNote', () => {
		const fn = vi.fn();
		noteSignals.onSelectNote(fn);
		noteSignals.signalDeleteNote('x');
		expect(fn).not.toHaveBeenCalled();
	});
});
