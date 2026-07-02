// Dev-only trace + timing for the app's core seams (services and repositories).
// In production every export here collapses to a bare passthrough: `import.meta.env.DEV`
// is a static literal Vite folds at build time, so the call sites tree-shake the
// logging branch out and `timedDb` / `timedFs` are never installed.
//
// The picture it draws for one user action (each span is a collapsible group):
//   notes.create
//     db.execute  INSERT INTO notes (id, content, title, preview, …)   2.1ms
//     db.execute  DELETE FROM note_tags WHERE note_id = $1             0.6ms
//     fs.writeTextFile  a1b2c3.md                                      1.4ms
//     5.0ms                          ← the group's own total (logged red on error)
// Service use-cases call `span`; the DB and filesystem leaves come for free from
// the two proxies installed at the backend chokepoints (`db.ts`, `fs.ts`).
//
// Nesting uses console.group/groupEnd, whose open-group stack is global, so spans
// that run concurrently (e.g. inside a `Promise.all`) mis-nest — the per-line
// timings stay correct, only the tree shape blurs. Good enough for a dev trace.

const DEV = import.meta.env.DEV;

/** Format a duration the way the trace shows it: 2 decimals under 1ms, else 1. */
function fmtMs(ms: number): string {
	return `${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)}ms`;
}

/**
 * Time an async use-case inside a collapsible console group (logged red on throw).
 * Anything it triggers (nested spans, DB queries, file IO) nests one level
 * underneath. In production this is exactly `fn()` — no timing, no logging.
 */
export function span<T>(label: string, fn: () => Promise<T>): Promise<T> {
	if (!DEV) return fn();
	console.groupCollapsed(label);
	const start = performance.now();
	const finish = (log: (ms: number) => void) => {
		const end = performance.now();
		log(end - start);
		console.groupEnd();
		// Mirror the span onto the User Timing track so DevTools → Performance
		// draws it as a Gantt bar (nesting and durations come for free).
		performance.measure(label, { start, end });
	};
	return fn().then(
		(value) => {
			finish((ms) => console.log(fmtMs(ms)));
			return value;
		},
		(error) => {
			finish((ms) =>
				console.error(`${fmtMs(ms)} ${error instanceof Error ? error.message : String(error)}`)
			);
			throw error;
		}
	);
}

/** Shorten a SQL string to one readable line for the trace. */
function sqlLabel(sql: string): string {
	const flat = sql.replace(/\s+/g, ' ').trim();
	return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
}

/**
 * Wrap a backend object so each async method logs one timed leaf line when it
 * resolves. Methods run on the original target (not the proxy), so private fields
 * (`#desk`) and getters keep working; sync methods pass through untouched.
 */
function traceCalls<T extends object>(
	target: T,
	prefix: string,
	describe: (args: unknown[]) => string
): T {
	return new Proxy(target, {
		get(obj, prop) {
			// Read with `obj` as the receiver, never the proxy: a getter like
			// `currentDesk` runs `this.#desk`, and `this` must be the real instance or
			// the private-field access throws.
			const value = Reflect.get(obj, prop, obj);
			if (typeof value !== 'function' || typeof prop !== 'string') return value;
			return (...args: unknown[]) => {
				const start = performance.now();
				const out = value.apply(obj, args);
				if (!(out instanceof Promise)) return out;
				return out.finally(() => {
					const end = performance.now();
					console.log(`${prefix}.${prop} ${describe(args)}  ${fmtMs(end - start)}`);
					performance.measure(`${prefix}.${prop}`, { start, end });
				});
			};
		}
	});
}

/** Wrap the SQLite connection so every `select` / `execute` is timed with its SQL. */
export function timedDb<T extends object>(db: T): T {
	return traceCalls(db, 'db', (args) => sqlLabel(String(args[0])));
}

/** Wrap the filesystem adapter so every read / write / remove is timed with its path. */
export function timedFs<T extends object>(fs: T): T {
	return traceCalls(fs, 'fs', (args) => String(args[0] ?? ''));
}
