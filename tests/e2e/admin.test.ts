import { expect, test, type Page } from '@playwright/test';
import { admin, as, asAdmin, en, logIn, newAccount, storageRoot, tryLogIn } from './support';

/** The admin's pages from the account menu (it opens Accounts), then one of them. */
async function openAdmin(page: Page, tab: string, path: string) {
	await logIn(page, admin.email, admin.password);
	await page.getByRole('button', { name: en.account_menu }).click();
	await page.getByRole('menuitem', { name: en.admin }).click();
	await expect(page).toHaveURL(/\/admin\/accounts$/);
	if (path !== 'accounts') await tab_(page, tab, path);
}

/** One of the admin's pages, waited for (a field filled earlier would be reset). */
async function tab_(page: Page, tab: string, path: string) {
	await page.getByRole('navigation', { name: en.admin }).getByRole('link', { name: tab }).click();
	await expect(page).toHaveURL(new RegExp(`/admin/${path}$`));
}

/** Searches an admin list, waiting for the results. */
async function search(page: Page, label: string, q: string) {
	await page.getByRole('searchbox', { name: label }).fill(q);
	await page.getByRole('searchbox', { name: label }).press('Enter');
	await expect(page).toHaveURL(/\?q=/);
}

const row = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text });

async function rowAction(page: Page, text: string, action: string) {
	await page.getByRole('button', { name: en.actions_for.replace('{name}', text) }).click();
	await page.getByRole('menuitem', { name: action }).click();
}

test('accounts: suspended, lifted, made admin; one owning an organization deleted once it has another owner', async ({
	page,
	browser
}) => {
	const account = await newAccount('managed');
	// It owns an organization the admin is a member of.
	const orgName = `Owned ${Date.now()}`;
	const org = await as<{ id: string }>(account, 'POST', '/api/v1/organizations', {
		name: orgName
	});
	await as(account, 'POST', `/api/v1/organizations/${org.id}/members`, { email: admin.email });

	await openAdmin(page, en.admin_accounts, 'accounts');
	await search(page, en.admin_search_accounts, account.email);
	await expect(page.getByRole('row')).toHaveCount(2);

	// Suspended: its login refused; lifted.
	await rowAction(page, account.email, en.suspend);
	await expect(row(page, account.email)).toContainText(en.suspended);
	const other = await browser.newPage();
	await tryLogIn(other, account.email, account.password);
	await expect(other.getByRole('alert')).toHaveText(en.error_account_suspended);
	await rowAction(page, account.email, en.lift);
	await expect(row(page, account.email)).not.toContainText(en.suspended);

	await rowAction(page, account.email, en.admin_make);
	await expect(row(page, account.email)).toContainText(en.admin_badge);
	await rowAction(page, account.email, en.admin_unmake);
	await expect(row(page, account.email)).not.toContainText(en.admin_badge);

	// Deleted: refused while it owns the organization (its email typed).
	await rowAction(page, account.email, en.delete);
	let dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.email).fill(account.email);
	await dialog.getByRole('button', { name: en.delete }).click();
	await expect(dialog.getByRole('alert')).toHaveText(en.error_owns_organizations);
	await dialog.getByRole('button', { name: en.cancel }).click();

	// The admin gives the organization another owner (itself), then deletes the account.
	await tab_(page, en.admin_organizations, 'organizations');
	await search(page, en.admin_search_organizations, orgName);
	await page.getByRole('button', { name: `${en.edit} ${orgName}` }).click();
	dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.member_owner).fill(admin.email);
	await dialog.getByLabel(en.quota_gib).fill('2');
	await dialog.getByRole('button', { name: en.save }).click();
	await expect(row(page, orgName)).toContainText(admin.email);
	await expect(row(page, orgName)).toContainText('of 2 GiB used');

	await tab_(page, en.admin_accounts, 'accounts');
	await search(page, en.admin_search_accounts, account.email);
	await rowAction(page, account.email, en.delete);
	dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.email).fill('not it');
	await dialog.getByRole('button', { name: en.delete }).click();
	await expect(dialog.getByRole('alert')).toHaveText(en.typed_mismatch);
	await dialog.getByLabel(en.email).fill(account.email);
	await dialog.getByRole('button', { name: en.delete }).click();
	await expect(page.getByText(en.nothing_found)).toBeVisible();

	// The organization, now the admin's, deleted (its name typed).
	await tab_(page, en.admin_organizations, 'organizations');
	await page.getByRole('button', { name: `${en.delete} ${orgName}` }).click();
	dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.organization_name).fill(orgName);
	await dialog.getByRole('button', { name: en.delete }).click();
	await expect(row(page, orgName)).toHaveCount(0);
});

test('settings, storages and jobs', async ({ page }) => {
	// The settings this test changes, at their defaults (a failed run may have left them).
	await asAdmin('PATCH', '/api/v1/admin/settings', {
		instance_name: null,
		max_pending_uploads: null
	});
	await openAdmin(page, en.admin_settings, 'settings');

	// Saves the edits, waiting for the save (nothing left to save).
	const save = async () => {
		await page.getByRole('button', { name: en.settings_save.replace('{count}', '1') }).click();
		await expect(
			page.getByRole('button', { name: en.settings_save.replace('{count}', '0') })
		).toBeDisabled();
	};

	// A setting through its control, saved, then back to its default.
	const name = page.locator('#setting-instance_name');
	await name.fill('Theca under test');
	await save();
	await expect(page.getByText(en.settings_saved)).toBeVisible();
	await page.getByRole('button', { name: en.setting_reset }).first().click();
	await save();
	await expect(name).toHaveValue('');

	// A number: sent as the setting's text.
	const pending = page.getByRole('textbox', { name: 'max_pending_uploads' });
	await pending.fill('16');
	await save();
	await expect(pending).toHaveValue('16');
	await pending.fill('');
	await save();
	await expect(pending).toHaveValue('');

	// A duration: shown in its unit, refused value said at its field.
	await page.getByRole('button', { name: 'trash_retention_secs' }).click();
	await expect(page.getByRole('spinbutton', { name: 'trash_retention_secs' })).toHaveValue('30');
	await expect(
		page.getByRole('combobox', { name: `trash_retention_secs (${en.unit})` })
	).toHaveValue('days');
	await expect(
		page.getByRole('button', { name: en.settings_save.replace('{count}', '1') })
	).toBeEnabled();
	await page.getByRole('button', { name: en.settings_discard }).click();

	// A storage added (a directory below the server's own), not made default.
	await tab_(page, en.admin_storages, 'storages');
	const storage = `extra-${Date.now()}`;
	await page.getByRole('button', { name: en.storage_add }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.setup_storage_name).fill(storage);
	await dialog.getByLabel(en.setup_path).fill(`${storageRoot}/${storage}`);
	await dialog.getByRole('button', { name: en.storage_add }).click();
	await expect(row(page, storage)).toBeVisible();
	await expect(
		page.getByRole('button', { name: `${en.storage_make_default} ${storage}` })
	).toBeVisible();

	// A job run now: its run listed.
	await tab_(page, en.admin_jobs, 'jobs');
	const started = page.waitForResponse((r) => r.url().endsWith('/admin/jobs/cleanup/run'));
	await page.getByRole('button', { name: `${en.job_run} cleanup` }).click();
	expect((await started).ok()).toBe(true);
	// Its runs listed (the last 10: the count may not grow).
	await expect(
		page.getByRole('table', { name: en.job_runs.replace('{job}', 'cleanup') }).getByRole('row')
	).not.toHaveCount(0);
});

test('not an admin: no menu entry, a 404', async ({ page }) => {
	const account = await newAccount('plain');
	await logIn(page, account.email, account.password);
	await page.getByRole('button', { name: en.account_menu }).click();
	await expect(page.getByRole('menuitem', { name: en.admin })).toHaveCount(0);
	await page.keyboard.press('Escape');
	await page.goto('/admin/accounts');
	await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});
