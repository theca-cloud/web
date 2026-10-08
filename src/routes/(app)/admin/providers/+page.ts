import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/** The instance-wide login providers. */
export async function load({ fetch, depends }) {
	depends('app:admin');
	const providers = await call(api.GET('/api/v1/admin/identity-providers', { fetch }));
	return {
		providers: providers.expect('the instance’s providers'),
		crumbs: [{ label: m.admin(), href: '/admin' }, { label: m.admin_providers() }]
	};
}
