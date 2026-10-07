// The Web Worker owning @theca/client (its WASM module and the client).
import init, { ThecaClient } from '@theca/client';
import type { Answer, Request } from './engine';

const client: Promise<ThecaClient> = init().then(() => new ThecaClient(self.location.origin));

self.onmessage = async ({ data }: MessageEvent<Request & { id: number }>) => {
	let answer: Answer;
	try {
		await client;
		answer = { id: data.id, ok: true };
	} catch (e) {
		answer = { id: data.id, ok: false, error: String(e) };
	}
	self.postMessage(answer);
};
