import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/** The instance's organizations (at most 200), searched (`?q=`), and the storages a default may be. */
export async function load({ fetch, url, depends }) {
	depends('app:admin');
	const q = url.searchParams.get('q') ?? '';
	const [organizations, storages] = await Promise.all([
		call(
			api.GET('/api/v1/admin/organizations', { fetch, params: { query: { q: q || undefined } } })
		),
		call(api.GET('/api/v1/admin/storages', { fetch }))
	]);
	return {
		q,
		organizations: organizations.expect('the organizations'),
		storages: storages.expect('the storages'),
		crumbs: [{ label: m.admin(), href: '/admin' }, { label: m.admin_organizations() }]
	};
}
