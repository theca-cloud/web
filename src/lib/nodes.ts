// Node operations: one request whatever the count (the API takes lists), each
// item its own outcome.
import { api, call, type ApiError } from './api';
import type { components } from './openapi.js';
import type { Result } from './result';

export type Node = components['schemas']['Node'];
type Outcome = { error?: components['schemas']['ApiError'] | null; status?: number | null };

/** A batch's items split by outcome: a failed request fails them all. */
export type Split<T> = { done: T[]; failed: { item: T; error: ApiError }[] };

export function split<T>(items: T[], result: Result<Outcome[], ApiError>): Split<T> {
	if (!result.ok) {
		return { done: [], failed: items.map((item) => ({ item, error: result.error })) };
	}
	const done: T[] = [];
	const failed: Split<T>['failed'] = [];
	items.forEach((item, i) => {
		const { error, status } = result.data[i];
		if (error) {
			failed.push({ item, error: { ...error, status: status ?? 0 } });
		} else {
			done.push(item);
		}
	});
	return { done, failed };
}

export type Change = components['schemas']['UpdateNode'];
export type Copy = components['schemas']['CopyNode'];

/** Renames and moves (`replace`: onto a file of that name, merging histories). */
export function update(nodes: Change[]) {
	return call(api.PATCH('/api/v1/nodes', { body: { nodes } }));
}

/** Copies (`replace`: a new version of a file of that name). */
export function copy(nodes: Copy[]) {
	return call(api.POST('/api/v1/nodes/copy', { body: { nodes } }));
}

/** To the trash. */
export function trash(nodes: string[]) {
	return call(api.POST('/api/v1/nodes/trash', { body: { nodes, permanent: false } }));
}

/** Out of the trash. */
export function restore(nodes: string[]) {
	return call(api.POST('/api/v1/nodes/restore', { body: { nodes } }));
}
