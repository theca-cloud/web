import { expect, test } from '@playwright/test';
import { admin, en, logIn } from './support';

test('the engine and the Service Worker start', async ({ page }) => {
	await logIn(page, admin.email, admin.password);
	const status = (term: string) => page.locator('dt', { hasText: term }).locator('+ dd');
	await expect(status(en.skeleton_engine)).toHaveText(en.status_ready);
	await expect(status(en.skeleton_service_worker)).toHaveText(en.status_ready);
});
