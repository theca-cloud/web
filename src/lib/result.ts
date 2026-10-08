/**
 * Errors as values, as in Rust: a function that can fail returns a `Result`
 * and never throws; failures are caught as deep as possible (`call` in
 * `api.ts`, the engine's answers) and the caller must look at `ok` before it
 * reaches the data. A handled error becomes a message where the user acted.
 *
 * Throwing is kept for what the app can't go on from: `load` functions throw
 * (`expect`, or SvelteKit's `error()`), and `+error.svelte` shows it.
 */

/**
 * Thrown by `Result.expect` when an invariant is violated.
 *
 * Kept free of any SvelteKit import so this module stays a plain data type.
 * `handleError` in `src/hooks.client.ts` logs it and shows a generic message.
 */
export class Panic extends Error {
	constructor(
		message: string,
		readonly cause?: unknown
	) {
		super(message);
		this.name = 'Panic';
	}
}

interface IResult<T, E> {
	readonly ok: boolean;
	map<U>(f: (v: T) => U): Result<U, E>;
	andThen<U>(f: (v: T) => Result<U, E>): Result<U, E>;
	mapErr<F>(f: (e: E) => F): Result<T, F>;
	unwrapOr(fallback: T): T;
	/**
	 * Unwrap, or throw a `Panic` carrying `message`.
	 *
	 * Use this in `load` for states that should be impossible: a failed request,
	 * a broken invariant. Expected absence is not a panic: a folder that doesn't
	 * exist is SvelteKit's `error(404, ...)`. Never use it in an event handler:
	 * a throw there reaches no error page (an unhandled rejection, nothing on
	 * screen); show the error where the user acted instead.
	 */
	expect(message: string): T;
}

class Ok<T, E = never> implements IResult<T, E> {
	readonly ok = true;
	declare private readonly _phantomE: E;
	constructor(readonly data: T) {}
	map<U>(f: (v: T) => U): Result<U, E> {
		return new Ok(f(this.data));
	}
	andThen<U>(f: (v: T) => Result<U, E>): Result<U, E> {
		return f(this.data);
	}
	mapErr<F>(_f: (e: E) => F): Result<T, F> {
		return this as unknown as Result<T, F>;
	}
	unwrapOr(_fallback: T): T {
		return this.data;
	}
	expect(_message: string): T {
		return this.data;
	}
}

class Err<T = never, E = undefined> implements IResult<T, E> {
	readonly ok = false;
	declare private readonly _phantomT: T;
	constructor(readonly error: E) {}
	map<U>(_f: (v: T) => U): Result<U, E> {
		return this as unknown as Result<U, E>;
	}
	andThen<U>(_f: (v: T) => Result<U, E>): Result<U, E> {
		return this as unknown as Result<U, E>;
	}
	mapErr<F>(f: (e: E) => F): Result<T, F> {
		return new Err(f(this.error));
	}
	unwrapOr(fallback: T): T {
		return fallback;
	}
	expect(message: string): T {
		throw new Panic(message, this.error);
	}
}

export type Result<T, E = undefined> = Ok<T, E> | Err<T, E>;

export function ok<T>(data: T): Ok<T, never> {
	return new Ok(data);
}
export function err(): Err<never, undefined>;
export function err<E>(error: E): Err<never, E>;
export function err<E = undefined>(error?: E): Err<never, E | undefined> {
	return new Err(error);
}

type DataOf<P> = P extends Promise<Result<infer U, unknown>> ? U : never;
type ErrorOf<P> = P extends Promise<Result<unknown, infer E>> ? E : never;

/** Every result's data, in order, or the first error (in order, not in time). */
export async function combineAll<T extends readonly Promise<Result<unknown, unknown>>[]>(
	promises: readonly [...T]
): Promise<Result<{ [K in keyof T]: DataOf<T[K]> }, ErrorOf<T[number]>>> {
	const settled = await Promise.all(promises);
	const data: unknown[] = [];
	for (const r of settled) {
		if (!r.ok) return err(r.error as ErrorOf<T[number]>);
		data.push(r.data);
	}
	// The runtime array matches the mapped tuple type, which TS cannot prove.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return ok(data as any);
}
