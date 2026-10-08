import { api, call } from '#lib/api.js';

/** The instance's name and whether accounts can be created, for every page here. */
export async function load({ fetch }) {
	const instance = await call(api.GET('/api/v1/instance', { fetch }));
	return {
		instance: instance.unwrapOr({ name: 'Theca', registration: false, password_strength: 3 })
	};
}
