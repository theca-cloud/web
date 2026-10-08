import { error, redirect } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';
import { explain } from '#lib/errors.js';

/**
 * The account, its libraries and the instance, loaded once for every page here (the
 * libraries again when they change: `invalidate('app:libraries')`). Without a
 * session, the login (back here afterwards); an instance not set up yet, its
 * setup.
 */
export async function load({ fetch, url, untrack, depends }) {
	depends('app:libraries');
	const [me, libraries, instance] = await Promise.all([
		call(api.GET('/api/v1/me', { fetch })),
		call(api.GET('/api/v1/libraries', { fetch })),
		call(api.GET('/api/v1/instance', { fetch }))
	]);
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
	if (!libraries.ok) {
		error(libraries.error.status || 503, explain(libraries.error));
	}
	return {
		me: me.data,
		libraries: libraries.data,
		instance: instance.unwrapOr({ name: 'Theca', registration: false, password_strength: 3 })
	};
}
