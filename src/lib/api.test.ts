import { describe, expect, it } from 'vitest';
import { call } from './api';

const answer = (status: number, body?: unknown) => ({
	data: status < 300 ? body : undefined,
	error: status < 300 ? undefined : body,
	response: new Response(null, { status, statusText: 'Status text' })
});

describe('call', () => {
	it('returns the data of a 2xx answer', async () => {
		const result = await call(Promise.resolve(answer(200, { id: 1 })));
		expect(result.ok && result.data).toEqual({ id: 1 });
	});

	it('returns the API error of a non-2xx answer', async () => {
		const body = { code: 'chunk_missing', message: 'Missing', chunks: ['a'] };
		const result = await call(Promise.resolve(answer(409, body)));
		expect(!result.ok && result.error).toEqual({ status: 409, ...body });
	});

	it('returns `unknown` when the body is not the API error', async () => {
		const result = await call(Promise.resolve(answer(502, 'Bad gateway')));
		expect(!result.ok && result.error).toMatchObject({
			status: 502,
			code: 'unknown',
			message: 'Status text'
		});
	});

	it('returns `network` when no answer came', async () => {
		const result = await call(Promise.reject(new TypeError('Failed to fetch')));
		expect(!result.ok && result.error).toMatchObject({ status: 0, code: 'network' });
	});
});
