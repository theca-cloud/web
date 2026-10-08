import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/** The shared storages, with their usage. */
export async function load({ fetch, depends }) {
	depends('app:admin');
	const storages = await call(api.GET('/api/v1/admin/storages', { fetch }));
	return {
		storages: storages.expect('the storages'),
		crumbs: [{ label: m.admin(), href: '/admin' }, { label: m.admin_storages() }]
	};
}
