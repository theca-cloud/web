import { expect, test, type Page } from '@playwright/test';
import { asAdmin, emailLink, en, freshEmail, logIn, newAccount } from './support';

const STRONG = 'violet tractor on the moon';
const org = /\/([0-9a-f-]{36})\/settings$/;

/** A new organization made from the sidebar, as its owner: its settings page, and its id. */
async function found(page: Page, name: string): Promise<string> {
	await asAdmin('PATCH', '/api/v1/admin/settings', { organization_creation: 'anyone' });
	const owner = await newAccount('owner');
	await logIn(page, owner.email, owner.password);
	await page.getByRole('button', { name: en.organization_new }).click();
	await page.getByRole('dialog').getByLabel(en.name).fill(name);
	await page.getByRole('dialog').getByRole('button', { name: en.create }).click();
	await expect(page).toHaveURL(org);
	return org.exec(page.url())![1];
}

/** Makes a library in the organization from its page. */
async function newLibrary(page: Page, id: string, name: string) {
	await page.goto(`/${id}`);
	await page.getByRole('main').getByRole('button', { name: en.new_library }).click();
	await page.getByRole('dialog').getByLabel(en.name).fill(name);
	await page.getByRole('dialog').getByRole('button', { name: en.create }).click();
	await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText(name);
}

test('an organization: created, renamed, a member invited and given a library, owned by them, deleted', async ({
	page,
	browser
}) => {
	const name = `Acme ${Date.now()}`;
	const id = await found(page, name);
	await newLibrary(page, id, 'Plans');

	// Its usage, with the quota the admin set.
	await asAdmin('PATCH', `/api/v1/admin/organizations/${id}`, { quota: 10 * 1024 ** 3 });
	await page.goto(`/${id}`);
	await expect(page.getByText(/of 10 GiB used/)).toBeVisible();
	await expect(page.getByRole('meter', { name: en.usage_label })).toBeVisible();

	await page.getByRole('main').getByRole('link', { name: en.organization_settings }).click();
	await page.getByLabel(en.organization_name).fill(`${name} SA`);
	await page.getByRole('button', { name: en.save }).click();
	await expect(page.getByText(en.organization_renamed)).toBeVisible();
	await expect(page.getByRole('link', { name: `${name} SA`, exact: true }).first()).toBeVisible();

	// A new address is invited, accepts, then reaches Plans read-only.
	const email = freshEmail('member');
	await page.getByRole('button', { name: en.member_add }).click();
	await page.getByRole('dialog').getByLabel(en.email).fill(email);
	await page.getByRole('dialog').getByRole('button', { name: en.member_add }).click();
	await expect(page.getByRole('row').filter({ hasText: email })).toContainText(en.member_pending);
	const member = await browser.newPage();
	await member.goto(await emailLink(email));
	await member.getByLabel(en.new_password).fill(STRONG);
	await member.getByRole('button', { name: en.invite_submit }).click();
	await expect(member.getByRole('button', { name: en.account_menu })).toHaveText(email);

	await page.getByRole('button', { name: `${en.library_members} Plans` }).click();
	const dialog = page.getByRole('dialog');
	await dialog
		.getByRole('combobox', { name: en.library_member_add })
		.selectOption({ label: email });
	await dialog.getByRole('combobox', { name: en.role, exact: true }).selectOption('read');
	await dialog.getByRole('button', { name: en.library_member_add }).click();
	await expect(dialog.getByRole('listitem').filter({ hasText: email })).toBeVisible();
	await dialog.getByRole('button', { name: en.done }).click();

	await member.goto(`/${id}`);
	await expect(member.getByRole('row').filter({ hasText: 'Plans' })).toContainText(en.read_only);
	// Not the owner: no settings.
	await expect(member.getByRole('link', { name: en.organization_settings })).toHaveCount(0);
	await member.goto(`/${id}/settings`);
	await expect(member.getByRole('heading', { name: '404' })).toBeVisible();

	// The ownership given: the settings gone for the old owner, there for the new one.
	await page.getByRole('button', { name: en.ownership_transfer }).click();
	await page.getByRole('dialog').getByLabel(en.ownership_to).selectOption({ label: email });
	await page.getByRole('dialog').getByRole('button', { name: en.ownership_transfer }).click();
	await expect(page).toHaveURL(new RegExp(`/${id}$`));
	await expect(page.getByRole('link', { name: en.organization_settings })).toHaveCount(0);

	// Deleted by the new owner: its name typed.
	await member.goto(`/${id}/settings`);
	await member.getByRole('button', { name: en.organization_delete }).click();
	const confirm = member.getByRole('dialog');
	await confirm.getByLabel(en.organization_name).fill('not it');
	await confirm.getByRole('button', { name: en.organization_delete }).click();
	await expect(confirm.getByRole('alert')).toHaveText(en.typed_mismatch);
	await confirm.getByLabel(en.organization_name).fill(`${name} SA`);
	await confirm.getByRole('button', { name: en.organization_delete }).click();
	await expect(member.getByRole('link', { name: `${name} SA` })).toHaveCount(0);
});

test('library groups and the login provider', async ({ page }) => {
	const id = await found(page, `Groups ${Date.now()}`);
	await newLibrary(page, id, 'Payroll');
	await newLibrary(page, id, 'All staff');
	await page.goto(`/${id}/settings`);

	// Library groups are advanced: folded away until asked for.
	await expect(page.getByText(en.groups_none)).toBeHidden();
	// By its text: a <summary> has no reliable role to find it by.
	await page.getByText(en.advanced, { exact: true }).click();
	await expect(page.getByText(en.groups_advanced_text)).toBeVisible();
	await expect(page.getByText(en.groups_none)).toBeVisible();
	await page.getByRole('button', { name: en.group_create }).click();
	await page.getByRole('dialog').getByLabel(en.name).fill('Shared');
	await page.getByRole('dialog').getByRole('button', { name: en.create }).click();
	const libraries = page.getByRole('list', { name: 'Libraries of Shared' });
	const add = page.getByRole('combobox', { name: 'Add a library to Shared' });
	await add.selectOption({ label: 'Payroll' });
	await page.getByRole('dialog').getByRole('button', { name: en.group_add }).click();
	await expect(libraries).toContainText('Payroll');

	// The second one: the warning names both.
	await add.selectOption({ label: 'All staff' });
	await expect(page.getByRole('dialog')).toContainText('Members of All staff and of Payroll');
	await page.getByRole('dialog').getByRole('button', { name: en.group_add }).click();
	await expect(libraries).toContainText('All staff');
	await page.getByRole('button', { name: 'Remove Payroll from Shared' }).click();
	await expect(libraries).not.toContainText('Payroll');

	// A provider: an internal issuer refused (the SSRF guard), then allowed by
	// the instance; its callback URL and login link shown; deleted.
	await page.getByRole('button', { name: en.provider_add }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.name).fill('Corporate SSO');
	await dialog.getByLabel(en.provider_issuer).fill('https://localhost');
	// Its test goes through the SSRF guard, as its logins would: refused.
	await dialog.getByRole('button', { name: en.connection_test }).click();
	await expect(
		dialog
			.getByRole('status')
			.filter({ hasText: new RegExp(`^${en.connection_failed.split('{')[0]}`) })
	).toBeVisible();
	await dialog.getByLabel(en.provider_client_id).fill('theca');
	await dialog.getByLabel(en.provider_secret).fill('a client secret');
	await dialog.getByRole('button', { name: en.create }).click();
	await expect(dialog.getByRole('alert')).toHaveText(en.error_issuer_refused);
	await asAdmin('PATCH', '/api/v1/admin/settings', { oidc_allow_internal_issuers: 'true' });
	try {
		await dialog.getByRole('button', { name: en.create }).click();
		// Created (the dialog closes) before the setting goes back: a click
		// returns before the server answers, which then refused it at times.
		await expect(dialog).toBeHidden();
	} finally {
		await asAdmin('PATCH', '/api/v1/admin/settings', { oidc_allow_internal_issuers: 'false' });
	}
	await expect(page.getByText(/\/api\/v1\/auth\/oidc\/[0-9a-f-]{36}\/callback$/)).toBeVisible();
	await expect(page.getByText(/\/api\/v1\/auth\/oidc\/[0-9a-f-]{36}\/start$/)).toBeVisible();
	await page.getByRole('button', { name: `${en.delete} Corporate SSO` }).click();
	await page.getByRole('dialog').getByRole('button', { name: en.delete }).click();
	await expect(page.getByText('Corporate SSO')).toHaveCount(0);
});
