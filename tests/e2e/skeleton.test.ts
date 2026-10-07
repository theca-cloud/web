import { expect, test } from '@playwright/test';
import en from '../../messages/en.json' with { type: 'json' };

test('the engine and the Service Worker start', async ({ page }) => {
	await page.goto('/');
	const status = (term: string) => page.locator('dt', { hasText: term }).locator('+ dd');
	await expect(status(en.skeleton_engine)).toHaveText(en.status_ready);
	await expect(status(en.skeleton_service_worker)).toHaveText(en.status_ready);
});

test('the session cookie is kept', async ({ page }) => {
	await page.goto('/');
	const email = await page.evaluate(async () => {
		const login = await fetch('/api/v1/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'dev@theca.test', password: 'theca-dev-password' })
		});
		if (!login.ok) return `login: ${login.status}`;
		const me = await fetch('/api/v1/me');
		return me.ok ? (await me.json()).email : `me: ${me.status}`;
	});
	expect(email).toBe('dev@theca.test');
});
