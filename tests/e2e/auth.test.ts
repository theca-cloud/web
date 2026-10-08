import { expect, test } from '@playwright/test';
import {
	admin,
	adminOrganization,
	asAdmin,
	emailLink,
	en,
	fresh,
	freshEmail,
	freshStorage,
	logIn,
	tryLogIn,
	anOrganization,
	newAccount
} from './support';

test('logging in, back where it was asked, then out', async ({ page }) => {
	await tryLogIn(page, admin.email, 'a wrong password');
	await expect(page.getByRole('alert')).toHaveText(en.error_invalid_credentials);

	await logIn(page, admin.email, admin.password, '/about?from=test');
	await expect(page).toHaveURL('/about?from=test');
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
	await expect(page).toHaveURL(anOrganization);
});

test('registering, through the email', async ({ page }) => {
	await asAdmin('PATCH', '/api/v1/admin/settings', { registration: 'open' });
	const email = freshEmail('register');
	await page.goto('/login');
	await page.getByRole('link', { name: en.login_register }).click();
	await expect(page).toHaveURL('/register');
	await page.getByLabel(en.email).fill(email);
	// Scored as the server will, then refused by it all the same.
	await page.getByLabel(en.password).fill('password1234');
	await expect(page.getByRole('meter', { name: en.strength })).toHaveAttribute(
		'aria-valuenow',
		'1'
	);
	await page.getByRole('button', { name: en.register_submit }).click();
	await expect(page.getByRole('alert')).toHaveText(en.error_weak_password);
	await page.getByLabel(en.password).fill('violet tractor on the moon');
	await page.getByRole('button', { name: en.register_submit }).click();
	await expect(page.getByText(en.register_sent)).toBeVisible();

	await page.goto(await emailLink(email));
	await expect(page).toHaveURL(anOrganization);
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
	await page.getByLabel(en.new_password).fill('violet tractor on the moon');
	await page.getByRole('button', { name: en.reset_submit }).click();
	await expect(page.getByText(en.reset_done)).toBeVisible();
	await logIn(page, account.email, 'violet tractor on the moon');
	await expect(page.getByRole('button', { name: en.account_menu })).toHaveText(account.email);
});

test('an invitation, accepted through the email', async ({ page }) => {
	const organization = await adminOrganization();
	const email = freshEmail('invited');
	await asAdmin('POST', `/api/v1/organizations/${organization}/members`, { email });

	await page.goto(await emailLink(email));
	// The page knows the address the link is for, and scores against it.
	await expect(page.getByText(email)).toBeVisible();
	await page.getByLabel(en.new_password).fill(email);
	await expect(page.getByRole('meter', { name: en.strength })).not.toHaveAttribute(
		'aria-valuenow',
		/[34]/
	);
	await page.getByLabel(en.new_password).fill('violet tractor on the moon');
	await page.getByRole('button', { name: en.invite_submit }).click();
	await expect(page).toHaveURL(anOrganization);
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
	await page.getByLabel(en.password).fill('violet tractor on the moon');
	await page.getByLabel(en.setup_organization_hint).fill('Fresh');
	await page.getByLabel(en.setup_path).fill(freshStorage);
	await page.getByRole('button', { name: en.setup_submit }).click();
	await expect(page).toHaveURL(new RegExp(`^${fresh}/[0-9a-f-]{36}$`));
	await expect(page.getByRole('button', { name: en.account_menu })).toHaveText(email);
});
