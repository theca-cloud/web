import { api, call } from '#lib/api.js';
import { m } from '#lib/paraglide/messages.js';

/** Every setting: its stored value (none: the default), default, description. */
export async function load({ fetch, depends }) {
	depends('app:admin');
	const settings = await call(api.GET('/api/v1/admin/settings', { fetch }));
	return {
		settings: settings.expect('the settings'),
		crumbs: [{ label: m.admin(), href: '/admin' }, { label: m.admin_settings() }]
	};
}
