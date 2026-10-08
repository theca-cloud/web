import { describe, expect, it } from 'vitest';
import { formatSize } from './format';

describe('formatSize', () => {
	it('shows bytes, then binary units', () => {
		expect(formatSize(0)).toBe('0 B');
		expect(formatSize(1023)).toBe('1023 B');
		expect(formatSize(1536)).toBe('1.5 KiB');
		expect(formatSize(20 * 1024 * 1024)).toBe('20 MiB');
		expect(formatSize(5 * 1024 ** 5)).toBe('5 PiB');
	});
});
