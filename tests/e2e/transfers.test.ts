import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
	admin,
	adminOrganization,
	asAdmin,
	dropLibrary,
	en,
	logIn,
	newLibrary,
	randomBytes
} from './support';

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });
const panel = (page: Page) => page.getByRole('region', { name: en.transfers });

/** Waits for the uploads to end, then closes the panel. */
async function uploaded(page: Page) {
	await expect(panel(page).getByText(en.transfers_finished)).toBeVisible({ timeout: 30_000 });
}

async function closePanel(page: Page) {
	await panel(page).getByRole('button', { name: en.close }).click();
}

/** Downloads `name` from its row's menu: its bytes. */
async function download(page: Page, name: string): Promise<Buffer> {
	const saved = page.waitForEvent('download');
	await page.getByRole('button', { name: en.item_menu.replace('{name}', name) }).click();
	await page.getByRole('menuitem', { name: en.download }).click();
	return readFileSync((await (await saved).path())!);
}

test('files up and down, a name again: a new version, unchanged content: none', async ({
	page
}) => {
	const library = await newLibrary('Transfers');
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		const big = randomBytes(5 * 1024 * 1024 + 123);
		await page.getByLabel(en.upload, { exact: true }).setInputFiles([
			{ name: 'small.txt', mimeType: 'text/plain', buffer: Buffer.from('small') },
			{ name: 'big.bin', mimeType: 'application/octet-stream', buffer: big }
		]);
		await uploaded(page);
		await closePanel(page);
		await expect(row(page, 'big.bin')).toBeVisible();

		expect((await download(page, 'big.bin')).equals(big)).toBe(true);
		expect((await download(page, 'small.txt')).toString()).toBe('small');

		// The same name: a new version; the same content: nothing new.
		const edited = Buffer.concat([big, Buffer.from('more')]);
		await page.getByLabel(en.upload, { exact: true }).setInputFiles({
			name: 'big.bin',
			mimeType: 'application/octet-stream',
			buffer: edited
		});
		await uploaded(page);
		await expect(panel(page).getByText(en.state_done)).toBeVisible();
		await closePanel(page);
		await page.getByLabel(en.upload, { exact: true }).setInputFiles({
			name: 'big.bin',
			mimeType: 'application/octet-stream',
			buffer: edited
		});
		await uploaded(page);
		await expect(panel(page).getByText(en.state_unchanged)).toBeVisible();
		const listing = await asAdmin<{ id: string; name: string }[]>(
			'GET',
			`/api/v1/nodes/${library.root}/children`
		);
		const file = listing.find((n) => n.name === 'big.bin')!;
		const versions = await asAdmin<unknown[]>('GET', `/api/v1/files/${file.id}/versions`);
		expect(versions).toHaveLength(2);
		expect((await download(page, 'big.bin')).equals(edited)).toBe(true);
	} finally {
		await dropLibrary(library);
	}
});

test('a folder uploaded, dropped files', async ({ page }) => {
	const library = await newLibrary('Folders');
	const dir = mkdtempSync(join(tmpdir(), 'theca-'));
	mkdirSync(join(dir, 'Album', 'Sub'), { recursive: true });
	writeFileSync(join(dir, 'Album', 'a.txt'), 'a');
	writeFileSync(join(dir, 'Album', 'Sub', 'b.txt'), 'b');
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		await page.getByLabel(en.upload_folder, { exact: true }).setInputFiles(join(dir, 'Album'));
		await uploaded(page);
		await closePanel(page);
		await page.getByRole('link', { name: 'Album' }).click();
		await expect(row(page, 'a.txt')).toBeVisible();
		await page.getByRole('link', { name: 'Sub' }).click();
		await expect(row(page, 'b.txt')).toBeVisible();

		// Dropped onto the folder.
		await page.getByRole('region', { name: en.drop_here }).evaluate((zone) => {
			const data = new DataTransfer();
			data.items.add(new File(['dropped'], 'dropped.txt', { type: 'text/plain' }));
			for (const type of ['dragover', 'drop']) {
				zone.dispatchEvent(
					new DragEvent(type, { dataTransfer: data, bubbles: true, cancelable: true })
				);
			}
		});
		await uploaded(page);
		await expect(row(page, 'dropped.txt')).toBeVisible();
	} finally {
		await dropLibrary(library);
	}
});

test('a refused name fails alone; the quota is said', async ({ page }) => {
	const library = await newLibrary('Refused');
	const organization = await adminOrganization();
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		await page.getByLabel(en.upload, { exact: true }).setInputFiles([
			{ name: 'CON.txt', mimeType: 'text/plain', buffer: Buffer.from('reserved') },
			{ name: 'fine.txt', mimeType: 'text/plain', buffer: Buffer.from('fine') }
		]);
		await uploaded(page);
		await expect(panel(page).getByText(en.error_invalid_name)).toBeVisible();
		await closePanel(page);
		await expect(row(page, 'fine.txt')).toBeVisible();

		await asAdmin('PATCH', `/api/v1/admin/organizations/${organization}`, { quota: 1000 });
		await page.getByLabel(en.upload, { exact: true }).setInputFiles({
			name: 'large.bin',
			mimeType: 'application/octet-stream',
			buffer: randomBytes(100_000)
		});
		await uploaded(page);
		await expect(panel(page).getByText(en.error_quota_exceeded)).toBeVisible();
	} finally {
		await asAdmin('PATCH', `/api/v1/admin/organizations/${organization}`, { quota: null });
		await dropLibrary(library);
	}
});

test('a cancelled upload leaves nothing', async ({ page }) => {
	const library = await newLibrary('Cancel');
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		// Large enough to still be hashing when cancelled; through a file (Playwright
		// takes at most 50 MB in memory).
		const huge = join(mkdtempSync(join(tmpdir(), 'theca-')), 'huge.bin');
		writeFileSync(huge, randomBytes(64 * 1024 * 1024));
		await page.getByLabel(en.upload, { exact: true }).setInputFiles(huge);
		await panel(page).getByRole('button', { name: en.cancel_all }).click();
		await uploaded(page);
		await expect(panel(page).getByText(en.state_cancelled)).toBeVisible();
		await closePanel(page);
		await expect(row(page, 'huge.bin')).toHaveCount(0);
	} finally {
		await dropLibrary(library);
	}
});

test.describe('without a Service Worker', () => {
	test.use({ serviceWorkers: 'block' });

	test("downloads go through the server's stream", async ({ page }) => {
		const library = await newLibrary('Fallback');
		try {
			await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
			const bytes = randomBytes(3 * 1024 * 1024);
			await page.getByLabel(en.upload, { exact: true }).setInputFiles({
				name: 'served.bin',
				mimeType: 'application/octet-stream',
				buffer: bytes
			});
			await uploaded(page);
			await closePanel(page);
			expect((await download(page, 'served.bin')).equals(bytes)).toBe(true);
		} finally {
			await dropLibrary(library);
		}
	});
});
