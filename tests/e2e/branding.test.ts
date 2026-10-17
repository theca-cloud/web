import { expect, test } from '@playwright/test';
import { admin, dropLibrary, en, logIn, newLibrary, server } from './support';

async function instanceName(): Promise<string> {
	const instance = await fetch(`${server}/api/v1/instance`);
	return ((await instance.json()) as { name: string }).name;
}

test('the mark and the instance name, on the login and in the sidebar', async ({ page }) => {
	const instance = await instanceName();
	await page.goto('/login');
	await expect(page.getByRole('img', { name: en.app_name })).toBeVisible();
	await expect(page.getByText(instance, { exact: true })).toBeVisible();
	await expect(page).toHaveTitle(`${en.login_title} · ${instance}`);

	await logIn(page, admin.email, admin.password);
	// The sidebar's: the only mark in the app.
	await expect(page.getByRole('img', { name: en.app_name })).toBeVisible();
	await expect(page.getByText(instance, { exact: true }).first()).toBeVisible();
});

test('the tab names the library, then the folder', async ({ page }) => {
	const instance = await instanceName();
	const library = await newLibrary('Titled', ['Inside']);
	try {
		await logIn(page, admin.email, admin.password);
		await page.getByRole('link', { name: library.name }).first().click();
		await expect(page).toHaveTitle(`${library.name} · ${instance}`);
		await page.getByRole('link', { name: 'Inside' }).click();
		await expect(page).toHaveTitle(`Inside · ${instance}`);
	} finally {
		await dropLibrary(library);
	}
});

test('the server serves the favicon', async ({ request }) => {
	const favicon = await request.get('/favicon.svg');
	expect(favicon.status()).toBe(200);
	expect(favicon.headers()['content-type']).toContain('image/svg+xml');
});
