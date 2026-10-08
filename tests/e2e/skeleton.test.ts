import { expect, test } from '@playwright/test';
import { admin, en, logIn } from './support';

test('the engine and the Service Worker start (the About page)', async ({ page }) => {
	await logIn(page, admin.email, admin.password);
	await page.goto('/about');
	const status = (term: string) => page.locator('dt', { hasText: term }).locator('+ dd');
	await expect(status(en.about_engine)).toHaveText(en.status_ready);
	await expect(status(en.about_service_worker)).toHaveText(en.status_ready);
});
