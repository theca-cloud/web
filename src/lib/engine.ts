// The page's side of the engine: @theca/client runs in a Web Worker, never on
// the page's thread (hashing a large file there would freeze the page).
// Requests and answers carry an ID; one worker for the app, started on first use.
import { err, ok, type Result } from './result';

/** What the page asks the worker. Step 05 adds transfers. */
export type Request = { kind: 'ready' };

export type Answer = { id: number } & (
	{ ok: true; value?: unknown } | { ok: false; error: string }
);

let worker: Worker | undefined;
let next = 0;
const pending = new Map<number, (answer: Result<unknown, string>) => void>();

function start(): Worker {
	const w = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
	w.onmessage = ({ data }: MessageEvent<Answer>) => {
		const settle = pending.get(data.id);
		pending.delete(data.id);
		settle?.(data.ok ? ok(data.value) : err(data.error));
	};
	return w;
}

/** Sends `request` to the worker: its answer, or its error. Never throws. */
export function engine(request: Request): Promise<Result<unknown, string>> {
	worker ??= start();
	const id = next++;
	return new Promise((settle) => {
		pending.set(id, settle);
		worker!.postMessage({ id, ...request });
	});
}
