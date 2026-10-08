// The page's side of the upload engine: @theca/client runs in a Web Worker,
// never on the page's thread (hashing a large file there would freeze the
// page). Requests and answers carry an ID; an upload's events carry its run.
// One worker for the app, started on first use. Downloads are the Service
// Worker's (src/service-worker.ts), with its own engine.
import { err, ok, type Result } from './result';

/** An engine's error: the API's code, or the engine's own (`network`, `cancelled`...). */
export type EngineError = { code: string; message: string };

/** A file to upload, `path` below the folder (`a.txt`, `a/b/c.txt`). */
export type Entry = { path: string; file: File };

/** What an upload run reports. */
export type UploadEvent =
	| { kind: 'progress'; total: number; hashed: number; uploaded: number; skipped: number }
	| {
			kind: 'done';
			path: string;
			file: string;
			version: string;
			conflict: boolean;
			unchanged: boolean;
	  }
	| { kind: 'failed'; path: string; code: string; message: string };

/** What the page asks the worker. */
export type Request =
	| { kind: 'ready' }
	| {
			kind: 'upload';
			run: number;
			entries: Entry[];
			folders: string[];
			library: string;
			folder: string;
	  }
	| { kind: 'cancel'; run: number; path?: string };

export type Answer = { id: number } & ({ ok: true } | { ok: false; error: EngineError });

/** What the worker posts: an answer, or a run's event. */
export type Message = { answer: Answer } | { run: number; event: UploadEvent };

let worker: Worker | undefined;
let next = 0;
const pending = new Map<number, (answer: Result<undefined, EngineError>) => void>();
let listener: (run: number, event: UploadEvent) => void = () => {};

function start(): Worker {
	const w = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
	w.onmessage = ({ data }: MessageEvent<Message>) => {
		if ('event' in data) {
			listener(data.run, data.event);
			return;
		}
		const settle = pending.get(data.answer.id);
		pending.delete(data.answer.id);
		settle?.(data.answer.ok ? ok(undefined) : err(data.answer.error));
	};
	return w;
}

/** Sends `request` to the worker: done, or its error. Never throws. */
export function engine(request: Request): Promise<Result<undefined, EngineError>> {
	worker ??= start();
	const id = next++;
	return new Promise((settle) => {
		pending.set(id, settle);
		worker!.postMessage({ id, ...request });
	});
}

/** Where upload events go (one listener: the transfers' state). */
export function onUploadEvent(handler: (run: number, event: UploadEvent) => void) {
	listener = handler;
}
