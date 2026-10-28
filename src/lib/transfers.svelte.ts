// The uploads in progress and done, across the app: runs started from a
// folder, their files' states and their total progress, fed by the worker's
// events. The transfer panel shows them; navigating doesn't stop them.
import { invalidate } from '$app/navigation';
import { engine, onUploadEvent, type EngineError, type Entry, type UploadEvent } from './engine';

export type FileState = {
	path: string;
	state: 'queued' | 'done' | 'unchanged' | 'conflict' | 'failed' | 'cancelled';
	error?: EngineError;
};

export class Run {
	readonly id: number;
	files = $state<FileState[]>([]);
	total = $state(0);
	hashed = $state(0);
	/** Bytes sent, or already stored (deduplicated). */
	sent = $state(0);
	finished = $state(false);

	constructor(id: number, paths: string[]) {
		this.id = id;
		this.files = paths.map((path) => ({ path, state: 'queued' }));
	}
}

class Transfers {
	runs = $state<Run[]>([]);
	#next = 0;

	get active() {
		return this.runs.some((r) => !r.finished);
	}

	constructor() {
		onUploadEvent((id, event) => {
			const run = this.runs.find((r) => r.id === id);
			if (run) apply(run, event);
		});
	}

	/** Uploads `entries` (and creates `folders`) into `folder` of `library`. */
	async upload(entries: Entry[], folders: string[], library: string, folder: string) {
		const run = new Run(
			this.#next++,
			entries.map((e) => e.path)
		);
		this.runs.push(run);
		const result = await engine({ kind: 'upload', run: run.id, entries, folders, library, folder });
		// Nothing could start (the folders not created): every file fails with it.
		if (!result.ok) {
			for (const file of run.files) {
				if (file.state === 'queued') Object.assign(file, { state: 'failed', error: result.error });
			}
		}
		run.finished = true;
		await invalidate('app:folder');
	}

	/** Cancels one file of a run, or the whole run. */
	async cancel(run: Run, path?: string) {
		await engine({ kind: 'cancel', run: run.id, path });
	}

	/** Forgets the finished runs (the panel closes when none is left). */
	dismiss() {
		this.runs = this.runs.filter((r) => !r.finished);
	}
}

function apply(run: Run, event: UploadEvent) {
	if (event.kind === 'progress') {
		run.total = event.total;
		run.hashed = event.hashed;
		run.sent = event.uploaded + event.skipped;
		return;
	}
	if (event.kind === 'skipped') {
		run.files = run.files.filter((f) => f.path !== event.path);
		return;
	}
	const file = run.files.find((f) => f.path === event.path);
	if (!file) return;
	if (event.kind === 'done') {
		file.state = event.unchanged ? 'unchanged' : event.conflict ? 'conflict' : 'done';
	} else {
		file.state = event.code === 'cancelled' ? 'cancelled' : 'failed';
		file.error = { code: event.code, message: event.message };
	}
}

export const transfers = new Transfers();
