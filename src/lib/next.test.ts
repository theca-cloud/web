import { describe, expect, it } from 'vitest';
import { safeNext } from './next';

describe('safeNext', () => {
	it('keeps a page of the app', () => {
		expect(safeNext('/a/b?c=d#e')).toBe('/a/b?c=d#e');
	});

	it('refuses anything that leaves it', () => {
		for (const next of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'a/b']) {
			expect(safeNext(next)).toBe('/');
		}
	});
});
