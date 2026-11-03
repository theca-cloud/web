import { redirect } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';

/**
 * The login flow a device started, to approve. Without a session, the login
 * (back here afterwards); an expired flow or a restricted session, its error,
 * which the page says.
 */
export async function load({ fetch, params, url }) {
	const flow = await call(
		api.GET('/api/v1/auth/flows/{id}', { fetch, params: { path: { id: params.flow } } })
	);
	if (!flow.ok && flow.error.status === 401) {
		redirect(307, `/login?next=${encodeURIComponent(url.pathname)}`);
	}
	return flow.ok ? { flow: flow.data, error: null } : { flow: null, error: flow.error };
}
