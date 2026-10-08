import { redirect } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';

/** Only while the instance isn't set up: afterwards, the login. */
export async function load({ fetch }) {
	const status = await call(api.GET('/api/v1/setup', { fetch }));
	if (status.ok && !status.data.required) {
		redirect(307, '/login');
	}
}
