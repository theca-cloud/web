import { api, call } from '#lib/api.js';

/** The instance's own OIDC providers (an organization's share their link instead). */
export async function load({ fetch }) {
	const providers = await call(api.GET('/api/v1/auth/oidc/providers', { fetch }));
	return { providers: providers.unwrapOr([]) };
}
