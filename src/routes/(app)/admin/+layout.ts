import { error } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';

/** The instance admin's pages: anyone else gets the 404 page. */
export async function load({ parent }) {
	const { me } = await parent();
	if (!me.instance_admin) {
		error(404, m.error_not_found());
	}
}
