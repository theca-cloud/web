import { engine } from '#lib/engine.js';
import { m } from '#lib/paraglide/messages.js';
import pkg from '../../../../package.json' with { type: 'json' };

/** Whether a Service Worker controls the page (waiting for it a moment on a first visit). */
async function serviceWorker(): Promise<string> {
	if (!('serviceWorker' in navigator)) return m.status_unavailable();
	if (!navigator.serviceWorker.controller) {
		await new Promise((resolve) => {
			navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
			setTimeout(resolve, 5000);
		});
	}
	return navigator.serviceWorker.controller ? m.status_ready() : m.status_unavailable();
}

/**
 * The versions, and whether the engine (its Web Worker) and the Service
 * Worker run: what a bug report needs.
 */
export async function load({ fetch }) {
	const [server, ready, worker] = await Promise.all([
		fetch('/api/version')
			.then((r) => (r.ok ? (r.json() as Promise<{ server: string }>) : null))
			.catch(() => null),
		engine({ kind: 'ready' }),
		serviceWorker()
	]);
	return {
		app: pkg.version,
		server: server?.server ?? '?',
		engine: ready.ok ? m.status_ready() : m.status_failed({ error: ready.error.message }),
		serviceWorker: worker,
		crumbs: [{ label: m.about_title() }]
	};
}
