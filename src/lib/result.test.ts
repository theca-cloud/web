import { describe, expect, it } from 'vitest';
import { combineAll, err, ok, Panic } from './result';

describe('combineAll', () => {
	it('returns every data, in order', async () => {
		const result = await combineAll([Promise.resolve(ok(1)), Promise.resolve(ok('a'))]);
		expect(result.ok && result.data).toEqual([1, 'a']);
	});

	it('returns the first error, in order', async () => {
		const result = await combineAll([
			Promise.resolve(ok(1)),
			Promise.resolve(err('first')),
			Promise.resolve(err('second'))
		]);
		expect(!result.ok && result.error).toBe('first');
	});
});

describe('expect', () => {
	it('throws a Panic carrying the error', () => {
		expect(() => err('cause').expect('broken')).toThrow(Panic);
		expect(ok(1).expect('broken')).toBe(1);
	});
});
