import { expect, test } from '@playwright/test';
import {
	admin,
	asAdmin,
	emailLink,
	en,
	fresh,
	freshEmail,
	freshStorage,
	logIn,
	newAccount
} from './support';

test('logging in, back where it was asked, then out', async ({ page }) => {
	await logIn(page, admin.email, 'a wrong password');
	await expect(page.getByRole('alert')).toHaveText(en.error_invalid_credentials);

	await logIn(page, admin.email, admin.password, '/?from=test');
	await expect(page).toHaveURL('/?from=test');
	await expect(page.getByRole('button', { name: en.account_menu })).toHaveText(admin.email);

	await page.getByRole('button', { name: en.account_menu }).click();
	await page.getByRole('menuitem', { name: en.logout }).click();
	await expect(page).toHaveURL('/login');
	await page.goto('/');
	await expect(page).toHaveURL('/login?next=%2F');
});

test('an expired session leads to the login, then back', async ({ page, context }) => {
	await logIn(page, admin.email, admin.password);
	await expect(page.getByRole('button', { name: en.account_menu })).toBeVisible();
	await context.clearCookies();
	// Logging out of a session already gone: to the login all the same.
	await page.getByRole('button', { name: en.account_menu }).click();
	await page.getByRole('menuitem', { name: en.logout }).click();
	await expect(page).toHaveURL('/login');
	await page.goto('/?again');
	await expect(page).toHaveURL('/login?next=%2F%3Fagain');
});

test('never sent elsewhere after logging in', async ({ page }) => {
	await logIn(page, admin.email, admin.password, '//elsewhere.test/');
	await expect(page).toHaveURL('/');
});

test('registering, through the email', async ({ page }) => {
	await asAdmin('PATCH', '/api/v1/admin/settings', { registration: 'open' });
	const email = freshEmail('register');
	await page.goto('/login');
	await page.getByRole('link', { name: en.login_register }).click();
	await expect(page).toHaveURL('/register');
	await page.getByLabel(en.email).fill(email);
	await page.getByLabel(en.password).fill('short');
	await page.getByRole('button', { name: en.register_submit }).click();
	await expect(page.getByRole('alert')).toContainText('8 characters');
	await page.getByLabel(en.password).fill('a test password');
	await page.getByRole('button', { name: en.register_submit }).click();
	await expect(page.getByText(en.register_sent)).toBeVisible();

	await page.goto(await emailLink(email));
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('button', { name: en.account_menu })).toHaveText(email);
});

test('a forgotten password, reset through the email', async ({ page }) => {
	const account = await newAccount('reset');
	await page.goto('/login');
	await page.getByRole('link', { name: en.login_forgot }).click();
	await expect(page).toHaveURL('/reset');
	await page.getByLabel(en.email).fill(account.email);
	await page.getByRole('button', { name: en.reset_ask_submit }).click();
	await expect(page.getByText(en.reset_sent)).toBeVisible();

	await page.goto(await emailLink(account.email));
	await page.getByLabel(en.new_password).fill('another test password');
	await page.getByRole('button', { name: en.reset_submit }).click();
	await expect(page.getByText(en.reset_done)).toBeVisible();
	await logIn(page, account.email, 'another test password');
	await expect(page.getByRole('button', { name: en.account_menu })).toHaveText(account.email);
});

test('an invitation, accepted through the email', async ({ page }) => {
	const me = await asAdmin<{ organizations: { organization: string; personal: boolean }[] }>(
		'GET',
		'/api/v1/me'
	);
	const organization = me.organizations[0].organization;
	const email = freshEmail('invited');
	await asAdmin('POST', `/api/v1/organizations/${organization}/members`, { email });

	await page.goto(await emailLink(email));
	await page.getByLabel(en.new_password).fill('a test password');
	await page.getByRole('button', { name: en.invite_submit }).click();
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('button', { name: en.account_menu })).toHaveText(email);
});

test("a failed OIDC login's reason", async ({ page }) => {
	await page.goto('/login?error=unknown_identity');
	await expect(page.getByRole('alert')).toHaveText(en.error_unknown_identity);
});

test('setting up a fresh instance', async ({ page }) => {
	const status = await fetch(`${fresh}/api/v1/setup`).then((r) => r.json());
	test.skip(!status.required, 'set up already: scripts/dev.sh --fresh starts it over');

	const email = freshEmail('admin');
	await page.goto(`${fresh}/setup`);
	await page.getByLabel(en.email).fill(email);
	await page.getByLabel(en.password).fill('a test password');
	await page.getByLabel(en.setup_organization_hint).fill('Fresh');
	await page.getByLabel(en.setup_path).fill(freshStorage);
	await page.getByRole('button', { name: en.setup_submit }).click();
	await expect(page).toHaveURL(`${fresh}/`);
	await expect(page.getByRole('button', { name: en.account_menu })).toHaveText(email);
});
