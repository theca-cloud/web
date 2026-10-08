import { error } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';
import { explain } from '#lib/errors.js';
import type { components } from '#lib/openapi.js';
import { m } from '#lib/paraglide/messages.js';
import { scopeFrom, widening } from '#lib/scope.js';

type Library = components['schemas']['Library'];

/**
 * What's trashed in the scope the URL says: each library's trashed files and
 * folders (a folder's: its library's, below it), and, for an organization or
 * everywhere, the trashed libraries. Loaded again after a change
 * (`invalidate('app:trash')`).
 */
export async function load({ url, parent, fetch, depends }) {
	depends('app:trash');
	const { me, libraries } = await parent();
	const scope = scopeFrom(url);
	const where = await widening(scope, me, libraries, fetch);
	if (!where) {
		error(404, m.error_not_found());
	}
	const joined = me.organizations.filter((o) => o.joined).map((o) => o.organization);
	let listed: Library[];
	let organizations: string[] = [];
	if (scope.kind === 'folder' || scope.kind === 'library') {
		const id = scope.kind === 'folder' ? where.folder!.library : scope.id;
		listed = libraries.filter((l) => l.id === id);
	} else if (scope.kind === 'organization') {
		listed = libraries.filter((l) => l.organization === scope.id);
		organizations = [scope.id];
	} else {
		listed = libraries;
		organizations = joined;
	}

	const [groups, trashed] = await Promise.all([
		Promise.all(
			listed.map(async (library) => {
				const params = { path: { id: library.id } };
				const trash = await call(api.GET('/api/v1/libraries/{id}/trash', { fetch, params }));
				if (!trash.ok) error(trash.error.status || 503, explain(trash.error));
				// A folder's: what was below it.
				const below = where.folder ? `${where.folder.path}/` : '';
				return { library, entries: trash.data.filter((e) => e.path.startsWith(below)) };
			})
		),
		Promise.all(
			organizations.map(async (organization) => {
				const params = { path: { id: organization } };
				const trash = await call(api.GET('/api/v1/organizations/{id}/trash', { fetch, params }));
				if (!trash.ok) error(trash.error.status || 503, explain(trash.error));
				return trash.data.map((library) => ({ ...library, organization }));
			})
		)
	]);
	return {
		scope,
		options: where.options,
		groups: groups.filter((g) => g.entries.length > 0),
		trashedLibraries: trashed.flat(),
		crumbs: [{ label: m.trash() }]
	};
}
