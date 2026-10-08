import { api, call } from '#lib/api.js';

/**
 * The account's sessions and app passwords, and (a full session only) its ways
 * to log in and the providers it may link. A session restricted to an
 * organization (logged in through its provider) gets only the first two: the
 * server refuses it the rest (`full_session_required`).
 */
export async function load({ fetch, depends }) {
	depends('app:account');
	const [sessions, appPasswords] = await Promise.all([
		call(api.GET('/api/v1/auth/sessions', { fetch })),
		call(api.GET('/api/v1/auth/app-passwords', { fetch }))
	]);
	const all = sessions.expect('the account’s sessions');
	const restricted = all.some((s) => s.current && s.restricted_to);
	const [identities, providers] = restricted
		? [[], []]
		: await Promise.all([
				call(api.GET('/api/v1/auth/identities', { fetch })).then((r) =>
					r.expect('the account’s identities')
				),
				call(api.GET('/api/v1/auth/oidc/providers', { fetch })).then((r) =>
					r.expect('the identity providers')
				)
			]);
	return {
		sessions: all,
		appPasswords: appPasswords.expect('the account’s app passwords'),
		identities,
		providers,
		restricted
	};
}
