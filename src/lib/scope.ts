// Where search and trash look (decisions.md, search and trash follow the
// context): a folder and below, a library, an organization, or everywhere.
// In URLs as the API's parameters: `?folder=`, `?library=`, `?organization=`.
import { api, call } from './api';
import type { components } from './openapi.js';
import { m } from '#lib/paraglide/messages.js';

type Library = components['schemas']['Library'];
type Me = components['schemas']['Me'];
type NodeInfo = components['schemas']['NodeInfo'];

export type Scope =
	| { kind: 'folder'; id: string }
	| { kind: 'library'; id: string }
	| { kind: 'organization'; id: string }
	| { kind: 'everywhere' };

/** A scope the selector offers, with its label. */
export type ScopeOption = { scope: Scope; label: string };

export function scopeFrom(url: URL): Scope {
	for (const kind of ['folder', 'library', 'organization'] as const) {
		const id = url.searchParams.get(kind);
		if (id) return { kind, id };
	}
	return { kind: 'everywhere' };
}

/** The scope as query parameters (none for everywhere). */
export function scopeQuery(scope: Scope): Record<string, string> {
	return scope.kind === 'everywhere' ? {} : { [scope.kind]: scope.id };
}

/**
 * Where the user is, from a page's data: a folder below the root is a folder,
 * a library's root (or a file there) the library, an organization's page the
 * organization; elsewhere, everywhere.
 */
export function scopeHere(data: {
	scope?: Scope;
	node?: NodeInfo;
	library?: Library;
	organization?: { organization: string };
}): Scope {
	// The search and trash pages: their own.
	if (data.scope) return data.scope;
	if (data.node && data.library) {
		const folder = data.node.is_file ? data.node.parent : data.node.id;
		return folder && folder !== data.library.root
			? { kind: 'folder', id: folder }
			: { kind: 'library', id: data.library.id };
	}
	if (data.organization) return { kind: 'organization', id: data.organization.organization };
	return { kind: 'everywhere' };
}

/**
 * The scope and every wider one, labelled (folder → library → organization →
 * everywhere). A folder's needs its node (its library); `null` when it can't
 * be reached.
 */
export async function widening(
	scope: Scope,
	me: Me,
	libraries: Library[],
	fetch: typeof globalThis.fetch
): Promise<{ options: ScopeOption[]; folder?: NodeInfo } | null> {
	const options: ScopeOption[] = [];
	let library: Library | undefined;
	let folder: NodeInfo | undefined;
	if (scope.kind === 'folder') {
		const node = await call(
			api.GET('/api/v1/nodes/{id}', { fetch, params: { path: { id: scope.id } } })
		);
		if (!node.ok || node.data.is_file) return null;
		folder = node.data;
		options.push({ scope, label: folder.name });
		library = libraries.find((l) => l.id === folder!.library);
	} else if (scope.kind === 'library') {
		library = libraries.find((l) => l.id === scope.id);
		if (!library) return null;
	}
	if (library) options.push({ scope: { kind: 'library', id: library.id }, label: library.name });
	const organizationId =
		library?.organization ?? (scope.kind === 'organization' ? scope.id : undefined);
	if (organizationId) {
		const organization = me.organizations.find((o) => o.organization === organizationId);
		if (!organization) return null;
		options.push({
			scope: { kind: 'organization', id: organizationId },
			label: organization.personal ? m.my_files() : organization.name
		});
	}
	options.push({ scope: { kind: 'everywhere' }, label: m.everywhere() });
	return { options, folder };
}
