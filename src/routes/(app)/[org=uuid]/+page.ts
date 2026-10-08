import { error } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';

/** One of the account's organizations, and its libraries the account is in. */
export async function load({ params, parent }) {
	const { me, libraries } = await parent();
	const organization = me.organizations.find((o) => o.organization === params.org && o.joined);
	if (!organization) {
		error(404, m.error_not_found());
	}
	const name = organization.personal ? m.my_files() : organization.name;
	return {
		organization,
		libraries: libraries.filter((l) => l.organization === params.org),
		crumbs: [{ label: name }]
	};
}
