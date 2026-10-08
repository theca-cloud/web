import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/** Every background job with its last runs. */
export async function load({ fetch, depends }) {
	depends('app:admin');
	const jobs = await call(api.GET('/api/v1/admin/jobs', { fetch }));
	return {
		jobs: jobs.expect('the jobs'),
		crumbs: [{ label: m.admin(), href: '/admin' }, { label: m.admin_jobs() }]
	};
}
