import { describe, expect, it } from 'vitest';
import { browserOf } from './user-agent';

describe('browserOf', () => {
	it('names the browser and the system', () => {
		const chrome =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
		expect(browserOf(chrome)).toBe('Chrome · macOS');
		const edge =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0';
		expect(browserOf(edge)).toBe('Edge · Windows');
		const safari =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
		expect(browserOf(safari)).toBe('Safari · iOS');
	});

	it('falls back to nothing', () => {
		expect(browserOf('curl/8.0')).toBeNull();
		expect(browserOf(null)).toBeNull();
	});
});
