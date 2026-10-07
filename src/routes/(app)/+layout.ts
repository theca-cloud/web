import { error, redirect } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';
import { explain } from '#lib/errors.js';

/**
 * The account, loaded once for every page here: without a session, the login
 * (back here afterwards); an instance not set up yet, its setup.
 */
export async function load({ fetch, url, untrack }) {
	const me = await call(api.GET('/api/v1/me', { fetch }));
	if (!me.ok) {
		if (me.error.status === 401) {
			// Not a dependency: navigating within the app doesn't load the account again.
			const here = untrack(() => url.pathname + url.search);
			redirect(307, `/login?next=${encodeURIComponent(here)}`);
		}
		if (me.error.code === 'setup_required') {
			redirect(307, '/setup');
		}
		error(me.error.status || 503, explain(me.error));
	}
	return { me: me.data };
}
