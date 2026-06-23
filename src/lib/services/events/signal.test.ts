import { describe, it, expect, vi } from 'vitest';
import { Signal } from './signal';

describe('Signal', () => {
	it('calls the handler with the emitted args', () => {
		const fn = vi.fn();
		const sig = new Signal<[id: string]>();
		sig.on(fn);
		sig.emit('id-1');
		expect(fn).toHaveBeenCalledWith('id-1');
	});

	it('does not call the handler after the returned unsubscriber runs', () => {
		const fn = vi.fn();
		const sig = new Signal<[id: string]>();
		const unsub = sig.on(fn);
		unsub();
		sig.emit('id-1');
		expect(fn).not.toHaveBeenCalled();
	});

	it('calls all registered handlers', () => {
		const a = vi.fn();
		const b = vi.fn();
		const sig = new Signal<[id: string]>();
		sig.on(a);
		sig.on(b);
		sig.emit('id-2');
		expect(a).toHaveBeenCalledWith('id-2');
		expect(b).toHaveBeenCalledWith('id-2');
	});

	it('only removes the specific handler that unsubscribed', () => {
		const a = vi.fn();
		const b = vi.fn();
		const sig = new Signal<[id: string]>();
		const unsubA = sig.on(a);
		sig.on(b);
		unsubA();
		sig.emit('id-3');
		expect(a).not.toHaveBeenCalled();
		expect(b).toHaveBeenCalledWith('id-3');
	});

	it('deduplicates an identical handler registered twice', () => {
		const fn = vi.fn();
		const sig = new Signal();
		sig.on(fn);
		sig.on(fn);
		sig.emit();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('keeps separate Signal instances isolated', () => {
		const fn = vi.fn();
		const a = new Signal();
		const b = new Signal();
		a.on(fn);
		b.emit();
		expect(fn).not.toHaveBeenCalled();
	});
});
