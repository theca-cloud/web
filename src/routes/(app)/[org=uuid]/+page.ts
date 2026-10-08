import { error } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/** One of the account's organizations, its usage, and its libraries the account is in. */
export async function load({ params, parent, fetch }) {
	const { me, libraries } = await parent();
	const organization = me.organizations.find((o) => o.organization === params.org && o.joined);
	if (!organization) {
		error(404, m.error_not_found());
	}
	const usage = await call(
		api.GET('/api/v1/organizations/{id}', { fetch, params: { path: { id: params.org } } })
	);
	const name = organization.personal ? m.my_files() : organization.name;
	return {
		organization,
		usage: usage.expect('the organization’s usage'),
		libraries: libraries.filter((l) => l.organization === params.org),
		crumbs: [{ label: name }]
	};
}
