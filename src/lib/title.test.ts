import { describe, expect, it } from 'vitest';
import { title, type Page } from './title';

const at = (id: string, data: Record<string, unknown>, extra: Partial<Page> = {}) =>
	({ route: { id }, data, error: null, status: 200, ...extra }) as Page;
const instance = { name: 'Acme Cloud' };

describe('title', () => {
	it('names a page from its route', () => {
		expect(title(at('/(public)/login', { instance }))).toBe('Log in · Acme Cloud');
		const settings = at('/(app)/[org=uuid]/settings', {
			instance,
			organization: { name: 'Acme' },
			crumbs: [{ label: 'Acme' }, { label: 'Settings' }]
		});
		expect(title(settings)).toBe('Acme settings · Acme Cloud');
	});

	it('else from its last crumb', () => {
		const crumbs = [{ label: 'My files' }, { label: 'Photos' }, { label: '2026' }];
		expect(title(at('/(app)/[org=uuid]/[lib=uuid]/[[node=uuid]]', { instance, crumbs }))).toBe(
			'2026 · Acme Cloud'
		);
	});

	it('shows the status on the error page', () => {
		const crumbs = [{ label: 'Photos' }];
		expect(
			title(
				at('/(app)/x', { instance, crumbs }, { error: { message: 'x', status: 404 }, status: 404 })
			)
		).toBe('404 · Acme Cloud');
	});

	it('falls back to the instance alone, then to Theca', () => {
		expect(title(at('/(app)', { instance }))).toBe('Acme Cloud');
		expect(title(at('/(public)/login', {}))).toBe('Log in · Theca');
	});
});
