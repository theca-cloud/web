// The API, typed from the pinned core release's openapi.json (openapi.d.ts).
import createClient from 'openapi-fetch';
import type { components, paths } from './openapi';
import { err, ok, type Result } from './result';

/** Same origin: the session cookie goes with every request, JSON bodies (CSRF). */
export const api = createClient<paths>({ baseUrl: globalThis.location?.origin });

/**
 * A failed call: the API's error (its stable `code` decides what the app
 * shows), `unknown` when the body isn't the API's, `network` when no answer
 * came (`status` 0).
 */
export type ApiError = { status: number } & components['schemas']['ApiError'];

/** The answer's data, or its `ApiError`. Never throws. */
export async function call<T>(
	request: Promise<{ data?: T; error?: unknown; response: Response }>
): Promise<Result<T, ApiError>> {
	let answer;
	try {
		answer = await request;
	} catch (e) {
		return err({ status: 0, code: 'network', message: String(e) });
	}
	const { data, error, response } = answer;
	if (response.ok) return ok(data as T);
	const body = error as Partial<components['schemas']['ApiError']> | undefined;
	return err({
		status: response.status,
		code: body?.code ?? 'unknown',
		message: body?.message ?? response.statusText,
		chunks: body?.chunks
	});
}
