import { api, call } from '#lib/api.js';
import { explain } from '#lib/errors.js';

/**
 * The email a reset or invitation link (`?token=`) is for, without using it:
 * the new password is scored against it. `error`: the link is dead (used,
 * expired), said instead of a form that can't succeed.
 */
export async function linkEmail(fetch: typeof globalThis.fetch, url: URL) {
	const token = url.searchParams.get('token');
	if (!token) return { email: null, error: null };
	const result = await call(api.POST('/api/v1/auth/token', { fetch, body: { token } }));
	return result.ok
		? { email: result.data.email, error: null }
		: { email: null, error: explain(result.error) };
}
