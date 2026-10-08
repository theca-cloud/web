import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/** The instance's accounts (at most 200), searched by email (`?q=`). */
export async function load({ fetch, url, depends }) {
	depends('app:admin');
	const q = url.searchParams.get('q') ?? '';
	const accounts = await call(
		api.GET('/api/v1/admin/accounts', { fetch, params: { query: { q: q || undefined } } })
	);
	return {
		q,
		accounts: accounts.expect('the accounts'),
		crumbs: [{ label: m.admin(), href: '/admin' }, { label: m.admin_accounts() }]
	};
}
