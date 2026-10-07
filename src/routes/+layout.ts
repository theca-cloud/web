import { error } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';

// A single-page app: everything renders in the browser, nothing at build time.
export const ssr = false;
export const prerender = false;

/** A server without API v1 can't be used: said once, at the start. */
export async function load({ fetch }) {
	const version = await fetch('/api/version')
		.then((r) => (r.ok ? r.json() : null))
		.catch(() => null);
	if (version && !version.api?.includes('v1')) {
		error(503, m.error_unsupported_server());
	}
}
