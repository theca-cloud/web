// The Web Worker owning @theca/client for uploads: its WASM module, one
// client, the runs' events posted back to the page.
import init, { ThecaClient } from '@theca/client';
import type { EngineError, Message, Request } from './engine';

const client: Promise<ThecaClient> = init().then(() => new ThecaClient(self.location.origin));

/** The engine rejects with `{ code, message }`; anything else (the WASM failing to load) as `unknown`. */
function engineError(e: unknown): EngineError {
	if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
		return { code: String(e.code), message: String(e.message) };
	}
	return { code: 'unknown', message: String(e) };
}

function post(message: Message) {
	self.postMessage(message);
}

self.onmessage = async ({ data }: MessageEvent<Request & { id: number }>) => {
	try {
		const engine = await client;
		if (data.kind === 'upload') {
			const { run, entries, folders, library, folder } = data;
			await engine.upload(run, entries, folders, library, folder, null, (event: never) =>
				post({ run, event })
			);
		} else if (data.kind === 'cancel') {
			engine.cancel(data.run, data.path ?? null);
		}
		post({ answer: { id: data.id, ok: true } });
	} catch (e) {
		post({ answer: { id: data.id, ok: false, error: engineError(e) } });
	}
};
