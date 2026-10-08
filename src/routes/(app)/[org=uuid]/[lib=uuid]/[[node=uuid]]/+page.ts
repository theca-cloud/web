import { error } from '@sveltejs/kit';
import { api, call } from '#lib/api.js';
import type { Crumb } from '#lib/crumbs.js';
import { explain } from '#lib/errors.js';
import { m } from '#lib/paraglide/messages.js';

/**
 * A library's folder (its root without a node in the URL), or a file's page:
 * the node with its ancestors (the breadcrumbs), a folder's children. Loaded
 * again after a change (`invalidate('app:folder')`).
 */
export async function load({ params, parent, fetch, depends }) {
	depends('app:folder');
	const { me, libraries } = await parent();
	const library = libraries.find((l) => l.id === params.lib && l.organization === params.org);
	const organization = me.organizations.find((o) => o.organization === params.org);
	if (!library || !organization) {
		error(404, m.error_not_found());
	}
	const id = params.node ?? library.root;
	const node = await call(api.GET('/api/v1/nodes/{id}', { fetch, params: { path: { id } } }));
	if (!node.ok) {
		error(node.error.status || 503, explain(node.error));
	}
	if (node.data.library !== library.id) {
		error(404, m.error_not_found());
	}
	let children: Awaited<ReturnType<typeof listing>> = [];
	if (!node.data.is_file) {
		children = await listing(fetch, id);
	}

	const base = `/${params.org}/${params.lib}`;
	const crumbs: Crumb[] = [
		{ label: organization.personal ? m.my_files() : organization.name, href: `/${params.org}` },
		{ label: library.name, href: base },
		// The root (named "") is the library itself.
		...(node.data.ancestors ?? [])
			.filter((a) => a.name !== '')
			.map((a) => ({ label: a.name, href: `${base}/${a.id}` })),
		...(node.data.parent ? [{ label: node.data.name }] : [])
	];
	return { library, node: node.data, children, crumbs };
}

async function listing(fetch: typeof globalThis.fetch, id: string) {
	const children = await call(
		api.GET('/api/v1/nodes/{id}/children', { fetch, params: { path: { id } } })
	);
	if (!children.ok) {
		error(children.error.status || 503, explain(children.error));
	}
	return children.data;
}
