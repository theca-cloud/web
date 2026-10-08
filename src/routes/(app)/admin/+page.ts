import { redirect } from '@sveltejs/kit';

/** `/admin` opens its first page. */
export function load() {
	redirect(307, '/admin/accounts');
}
