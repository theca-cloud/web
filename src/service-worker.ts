/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Registered by SvelteKit. It downloads: `/sw/download/<file>?version=&size=&name=`
// is answered with @theca/client's stream of the file (its own engine: the
// page never holds one, and the page's Web Worker is out of its reach), so
// the browser saves it as any download, the memory bounded by the reader's
// pace (decisions.md, Presigned URLs). Everything else goes through
// untouched: no caching (the app isn't installable in V1).
import init, { ThecaClient } from '@theca/client';

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (event) => event.waitUntil(sw.clients.claim()));

// Loaded on the first download only.
let engine: Promise<ThecaClient> | undefined;

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin || !url.pathname.startsWith('/sw/download/')) return;
	event.respondWith(
		download(url).catch(
			// The engine failing to start, or the file to be found: said, not a bare network error.
			(e) => new Response(`${e?.message ?? e}`, { status: 502 })
		)
	);
});

async function download(url: URL): Promise<Response> {
	const file = url.pathname.slice('/sw/download/'.length);
	// Empty: the current version.
	const version = url.searchParams.get('version') || null;
	const size = url.searchParams.get('size');
	const name = url.searchParams.get('name') ?? 'download';
	engine ??= init().then(() => new ThecaClient(sw.location.origin));
	const stream: ReadableStream = (await engine).download(file, version);
	const headers = new Headers({
		'Content-Type': 'application/octet-stream',
		'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`
	});
	// The version's size, from the listing: the browser shows the progress.
	if (version && size) headers.set('Content-Length', size);
	return new Response(stream, { headers });
}
