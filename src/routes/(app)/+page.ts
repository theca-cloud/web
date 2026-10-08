import { redirect } from '@sveltejs/kit';

/** To the personal organization, else the first one (an account only invited). */
export async function load({ parent }) {
	const { me } = await parent();
	const joined = me.organizations.filter((o) => o.joined);
	const first = joined.find((o) => o.personal) ?? joined[0];
	if (first) {
		redirect(307, `/${first.organization}`);
	}
}
