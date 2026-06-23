/**
 * A single typed pub/sub channel. Handlers are deduplicated (a `Set`), fire in
 * registration order, and `on` returns its own unsubscriber so the caller never
 * has to hold onto the handler reference.
 *
 * The type parameter is the tuple of `emit` arguments, so `Signal<[id: string]>`
 * forces `emit(id)` and types the handler as `(id) => void`. A bare `Signal()`
 * is a void channel.
 */
export class Signal<A extends unknown[] = []> {
	#handlers = new Set<(...args: A) => void>();

	on(fn: (...args: A) => void): () => void {
		this.#handlers.add(fn);
		return () => this.#handlers.delete(fn);
	}

	emit(...args: A): void {
		this.#handlers.forEach((fn) => fn(...args));
	}
}
