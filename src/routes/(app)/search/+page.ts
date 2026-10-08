import { error } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';
import { explain } from '#lib/errors.js';
import { m } from '#lib/paraglide/messages.js';
import { scopeFrom, scopeQuery, widening } from '#lib/scope.js';

/** `?q=` in the scope the URL says (folder, library, organization, or everywhere). */
export async function load({ url, parent, fetch }) {
	const { me, libraries } = await parent();
	const scope = scopeFrom(url);
	const where = await widening(scope, me, libraries, fetch);
	if (!where) {
		error(404, m.error_not_found());
	}
	const q = (url.searchParams.get('q') ?? '').trim();
	let results: Awaited<ReturnType<typeof search>> = { ok: true, data: [] };
	if (q.length >= 3) {
		results = await search(fetch, q, scopeQuery(scope));
	}
	return {
		scope,
		q,
		options: where.options,
		results: results.ok ? results.data : [],
		problem: results.ok ? undefined : explain(results.error),
		crumbs: [{ label: m.search_title() }]
	};
}

async function search(fetch: typeof globalThis.fetch, q: string, scope: Record<string, string>) {
	const result = await call(
		api.GET('/api/v1/search', { fetch, params: { query: { q, ...scope } } })
	);
	return result.ok
		? { ok: true as const, data: result.data }
		: { ok: false as const, error: result.error };
}
