import { error } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/**
 * A company organization's settings, for its owner only (anyone else: the
 * 404 page): its members, libraries, library groups and login providers.
 */
export async function load({ params, parent, fetch, depends }) {
	depends('app:organization');
	const { me } = await parent();
	const organization = me.organizations.find((o) => o.organization === params.org);
	if (!organization?.owner || organization.personal) {
		error(404, m.error_not_found());
	}
	const path = { path: { id: params.org } };
	const [members, libraries, groups, providers] = await Promise.all([
		call(api.GET('/api/v1/organizations/{id}/members', { fetch, params: path })),
		call(api.GET('/api/v1/organizations/{id}/libraries', { fetch, params: path })),
		call(api.GET('/api/v1/organizations/{id}/namespaces', { fetch, params: path })),
		call(api.GET('/api/v1/organizations/{id}/identity-providers', { fetch, params: path }))
	]);
	return {
		organization,
		members: members.expect('the organization’s members'),
		libraries: libraries.expect('the organization’s libraries'),
		groups: groups.expect('the organization’s library groups'),
		providers: providers.expect('the organization’s providers'),
		crumbs: [
			{ label: organization.name, href: `/${params.org}` },
			{ label: m.organization_settings() }
		]
	};
}
