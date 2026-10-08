import { createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { anOrganization, en, logIn, newAccount, server, tryLogIn } from './support';

const STRONG = 'violet tractor on the moon';

/** Opens the account page from the menu, once the login's redirect landed (else it wins). */
async function openAccount(page: Page) {
	await expect(page).toHaveURL(anOrganization);
	await page.getByRole('button', { name: en.account_menu }).click();
	await page.getByRole('menuitem', { name: en.account }).click();
	await expect(page.getByRole('heading', { name: en.account, exact: true })).toBeVisible();
}

test('the password changed: the bar guides, the server decides, this session kept', async ({
	page,
	browser
}) => {
	const account = await newAccount('change');
	const other = await browser.newPage();
	await logIn(other, account.email, account.password);
	await logIn(page, account.email, account.password);
	await openAccount(page);

	await page.getByRole('button', { name: en.password_change }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.password_current).fill(account.password);
	const fresh = dialog.getByLabel(en.new_password, { exact: true });
	await fresh.fill('password1234');
	await expect(dialog.getByRole('meter', { name: en.strength })).toHaveAttribute(
		'aria-valuenow',
		'1'
	);
	await expect(dialog.getByText(en.password_warning_common)).toBeVisible();
	await dialog.getByRole('button', { name: en.password_change }).click();
	await expect(dialog.getByRole('alert')).toHaveText(en.error_weak_password);

	await fresh.fill(STRONG);
	await expect(dialog.getByRole('meter', { name: en.strength })).toHaveAttribute(
		'aria-valuenow',
		'4'
	);
	await dialog.getByRole('button', { name: en.password_change }).click();
	await expect(page.getByText(en.password_changed)).toBeVisible();

	// This session kept, the other one logged out; the new password works.
	await page.reload();
	await expect(page.getByRole('heading', { name: en.account, exact: true })).toBeVisible();
	await other.reload();
	await expect(other).toHaveURL(/\/login/);
	await tryLogIn(other, account.email, account.password);
	await expect(other.getByRole('alert')).toHaveText(en.error_invalid_credentials);
	await logIn(other, account.email, STRONG);
});

test('two-factor: turned on, asked at login, a recovery code, turned off', async ({ page }) => {
	const account = await newAccount('totp');
	await logIn(page, account.email, account.password);
	await openAccount(page);

	await page.getByRole('button', { name: en.totp_enable }).click();
	let dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('img', { name: en.totp_qr })).toBeVisible();
	const secret = (await dialog.locator('code').textContent()) ?? '';
	await dialog.getByLabel(en.totp_code).fill(totp(secret));
	await dialog.getByRole('button', { name: en.totp_confirm }).click();
	dialog = page.getByRole('dialog', { name: en.totp_codes_title });
	await expect(dialog.getByRole('listitem').first()).toBeVisible();
	const codes = await dialog.getByRole('listitem').allTextContents();
	expect(codes.length).toBeGreaterThan(1);
	await dialog.getByRole('button', { name: en.done }).click();
	await expect(page.getByText(en.totp_on)).toBeVisible();

	// The code just used can't log in again: a recovery code does.
	await page.context().clearCookies();
	await tryLogIn(page, account.email, account.password);
	await page.getByLabel(en.totp_code).fill(codes[0]);
	await page.getByRole('button', { name: en.login_submit }).click();
	await expect(page.getByRole('button', { name: en.account_menu })).toBeVisible();

	await openAccount(page);
	await page.getByRole('button', { name: en.totp_disable }).click();
	dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.totp_code).fill(codes[1]);
	await dialog.getByRole('button', { name: en.totp_disable }).click();
	await expect(page.getByText(en.totp_off)).toBeVisible();
});

test('sessions and app passwords: listed, created, used, revoked', async ({ page, browser }) => {
	const account = await newAccount('sessions');
	const other = await browser.newPage();
	await logIn(other, account.email, account.password);
	await logIn(page, account.email, account.password);
	await openAccount(page);

	// Two sessions, this one marked: the other revoked, its page sent to the login.
	const sessions = page.getByRole('row').filter({ hasText: /Chrome/ });
	await expect(sessions).toHaveCount(2);
	await expect(sessions.filter({ hasText: en.session_current })).toHaveCount(1);
	await page.getByRole('button', { name: new RegExp(`^${en.revoke} Chrome`) }).click();
	await expect(sessions).toHaveCount(1);
	await other.reload();
	await expect(other).toHaveURL(/\/login/);

	// An app password, shown once, opens WebDAV until revoked.
	await page.getByRole('button', { name: en.app_password_create }).click();
	let dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.name).fill('laptop drive');
	await dialog.getByRole('button', { name: en.create }).click();
	dialog = page.getByRole('dialog', { name: en.app_password_created });
	const password = (await dialog.getByLabel(en.app_password).textContent()) ?? '';
	await dialog.getByRole('button', { name: en.done }).click();
	const dav = () =>
		fetch(`${server}/dav/`, {
			method: 'PROPFIND',
			headers: { Authorization: `Basic ${btoa(`any:${password}`)}`, Depth: '1' }
		});
	expect((await dav()).status).toBe(207);

	await page.getByRole('button', { name: `${en.revoke} laptop drive` }).click();
	await page.getByRole('dialog').getByRole('button', { name: en.revoke }).click();
	await expect(page.getByText(en.app_passwords_none)).toBeVisible();
	expect((await dav()).status).toBe(401);
});

test('the export downloaded, then the account deleted', async ({ page }) => {
	const account = await newAccount('delete');
	await logIn(page, account.email, account.password);
	await openAccount(page);

	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: en.export }).click();
	const file = await download;
	expect(file.suggestedFilename()).toBe('theca-export.json');

	await page.getByRole('button', { name: en.account_delete }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel(en.password, { exact: true }).fill(account.password);
	await dialog.getByRole('button', { name: en.account_delete }).click();
	await expect(page).toHaveURL(/\/login/);
	await tryLogIn(page, account.email, account.password);
	await expect(page.getByRole('alert')).toHaveText(en.error_invalid_credentials);
});

/** The TOTP code for a base32 secret, now (RFC 6238: SHA-1, 30 s, 6 digits). */
function totp(secret: string): string {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	const bits = [...secret.replace(/=+$/, '').toUpperCase()]
		.map((c) => alphabet.indexOf(c).toString(2).padStart(5, '0'))
		.join('');
	const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
	const hmac = createHmac('sha1', key).update(counter).digest();
	const offset = hmac[hmac.length - 1] & 0xf;
	return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
