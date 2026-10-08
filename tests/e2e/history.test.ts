import { expect, test, type Page } from '@playwright/test';
import { admin, asAdmin, dropLibrary, en, logIn, newLibrary, randomBytes } from './support';

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });
const check = (page: Page, name: string) =>
	page.getByRole('checkbox', { name: en.select_item.replace('{name}', name) }).click();

/** Opens a folder of the listing, waiting for it (an upload right away would go to the previous one). */
async function openFolder(page: Page, name: string) {
	await page.getByRole('link', { name, exact: true }).click();
	await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText(name);
}

async function upload(page: Page, files: { name: string; buffer: Buffer; mimeType?: string }[]) {
	await page
		.getByLabel(en.upload, { exact: true })
		.setInputFiles(files.map((f) => ({ mimeType: 'application/octet-stream', ...f })));
	const panel = page.getByRole('region', { name: en.transfers });
	await expect(panel.getByText(en.transfers_finished)).toBeVisible({ timeout: 30_000 });
	await panel.getByRole('button', { name: en.close }).click();
}

const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64'
);
const SVG = Buffer.from(
	'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="teal"/><script>window.parent.document.title="pwned"</script></svg>'
);
const HTML = Buffer.from(
	'<html><body><p id="hello">Hello from HTML</p><script>window.parent.document.title="pwned"</script></body></html>'
);
const PDF = Buffer.from(
	'%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
);

test('trash: in its context, restored, deleted for good, widened', async ({ page }) => {
	const library = await newLibrary('Trash', ['Inside', 'Old']);
	const other = await newLibrary('Trashed');
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		await upload(page, [{ name: 'gone.txt', buffer: Buffer.from('gone') }]);
		await check(page, 'gone.txt');
		await check(page, 'Old');
		await page.getByRole('button', { name: en.delete }).click();
		await expect(row(page, 'Old')).toHaveCount(0);

		// Inside a folder, its trash is only what was below it.
		await openFolder(page, 'Inside');
		await upload(page, [{ name: 'deep.txt', buffer: Buffer.from('deep') }]);
		await page.getByRole('button', { name: en.item_menu.replace('{name}', 'deep.txt') }).click();
		await page.getByRole('menuitem', { name: en.delete }).click();
		await page.getByRole('link', { name: en.trash, exact: true }).click();
		await expect(row(page, 'deep.txt')).toBeVisible();
		await expect(row(page, 'gone.txt')).toHaveCount(0);

		// The library's: everything; one restored, one deleted for good.
		await page.getByLabel(en.search_in, { exact: true }).selectOption({ label: library.name });
		await expect(row(page, 'gone.txt')).toBeVisible();
		await check(page, 'gone.txt');
		await page.getByRole('button', { name: en.restore }).click();
		await expect(row(page, 'gone.txt')).toHaveCount(0);
		await check(page, 'Old');
		await page.getByRole('button', { name: en.delete_forever }).click();
		await page.getByRole('dialog').getByRole('button', { name: en.delete_forever }).click();
		await expect(row(page, 'Old')).toHaveCount(0);
		await page.goto(`/${library.organization}/${library.id}`);
		await expect(row(page, 'gone.txt')).toBeVisible();

		// The organization's: its trashed libraries too.
		await asAdmin('DELETE', `/api/v1/libraries/${other.id}`);
		await page.goto(`/trash?organization=${library.organization}`);
		await row(page, other.name).getByRole('button', { name: en.restore }).click();
		await expect(row(page, other.name)).toHaveCount(0);
		await expect(page.getByRole('link', { name: other.name }).first()).toBeVisible();
	} finally {
		await dropLibrary(library);
		await dropLibrary(other);
	}
});

test('versions: listed, the first made current, downloaded', async ({ page }) => {
	const library = await newLibrary('Versions');
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		await upload(page, [{ name: 'notes.txt', buffer: Buffer.from('first') }]);
		await upload(page, [{ name: 'notes.txt', buffer: Buffer.from('second, longer') }]);
		await page.getByRole('link', { name: 'notes.txt' }).click();
		await expect(page.getByRole('region', { name: en.preview })).toContainText('second, longer');
		const versions = page.getByRole('row');
		await expect(versions).toHaveCount(2);
		await expect(versions.first()).toContainText(en.version_current);

		const restore = `${en.version_restore} ${en.version_number.replace('{number}', '1')}`;
		await page.getByRole('button', { name: restore }).click();
		await expect(page.getByText(en.version_restored.replace('{number}', '1'))).toBeVisible();
		await expect(page.getByRole('region', { name: en.preview })).toContainText('first');
		const saved = page.waitForEvent('download');
		await page.getByRole('button', { name: en.download, exact: true }).click();
		const { readFileSync } = await import('node:fs');
		expect(readFileSync((await (await saved).path())!).toString()).toBe('first');
	} finally {
		await dropLibrary(library);
	}
});

test('search: in the folder, widened, too short, opened', async ({ page }) => {
	const library = await newLibrary('Search', ['In', 'Out']);
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		await openFolder(page, 'Out');
		await upload(page, [{ name: 'needle-out.txt', buffer: Buffer.from('out') }]);
		await page.goto(`/${library.organization}/${library.id}`);
		await openFolder(page, 'In');
		await upload(page, [{ name: 'needle-in.txt', buffer: Buffer.from('in') }]);
		await expect(row(page, 'needle-in.txt')).toBeVisible();

		const field = page.getByRole('search').first().getByPlaceholder(en.search_placeholder);
		await field.fill('needle');
		await field.press('Enter');
		await expect(row(page, 'needle-in.txt')).toBeVisible();
		await expect(row(page, 'needle-out.txt')).toHaveCount(0);

		await page.getByLabel(en.search_in, { exact: true }).selectOption({ label: library.name });
		await expect(row(page, 'needle-out.txt')).toBeVisible();
		await expect(row(page, 'needle-in.txt')).toBeVisible();

		await page.getByRole('link', { name: 'needle-out.txt' }).click();
		await expect(page.getByRole('heading', { name: 'needle-out.txt' })).toBeVisible();

		await page.goto(`/search?q=ne&library=${library.id}`);
		await expect(page.getByText(en.search_hint)).toBeVisible();
	} finally {
		await dropLibrary(library);
	}
});

test('previews: shown as the browser can, never running script', async ({ page }) => {
	const library = await newLibrary('Previews');
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		await upload(page, [
			{ name: 'dot.png', buffer: PNG, mimeType: 'image/png' },
			{ name: 'shape.svg', buffer: SVG, mimeType: 'image/svg+xml' },
			{ name: 'page.html', buffer: HTML, mimeType: 'text/html' },
			{ name: 'doc.pdf', buffer: PDF, mimeType: 'application/pdf' },
			{ name: 'readme.txt', buffer: Buffer.from('plain words'), mimeType: 'text/plain' },
			{ name: 'blob.bin', buffer: randomBytes(1000) },
			{ name: 'large.png', buffer: randomBytes(6 * 1024 * 1024), mimeType: 'image/png' }
		]);
		const title = await page.title();
		const preview = page.getByRole('region', { name: en.preview });
		const open = async (name: string) => {
			await page.goto(`/${library.organization}/${library.id}`);
			await page.getByRole('link', { name, exact: true }).click();
			await expect(page.getByRole('heading', { name })).toBeVisible();
		};

		await open('dot.png');
		await expect
			.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
			.toBe(1);

		await open('readme.txt');
		await expect(preview.locator('pre')).toHaveText('plain words');

		await open('shape.svg');
		await expect
			.poll(() => preview.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
			.toBe(10);

		await open('page.html');
		const frame = preview.frameLocator('iframe');
		await expect(frame.locator('#hello')).toHaveText('Hello from HTML');
		await preview.getByRole('button', { name: en.preview_raw }).click();
		await expect(preview.locator('pre')).toContainText('<p id="hello">');

		await open('doc.pdf');
		await expect(preview.locator('iframe')).toHaveAttribute('src', /^blob:/);

		await open('large.png');
		await expect(preview.locator('img')).toHaveCount(0);
		await preview.getByRole('button', { name: /^Show preview/ }).click();
		await expect(preview.locator('img')).toHaveCount(1);

		await open('blob.bin');
		await expect(preview.locator('img, video, audio, iframe, pre')).toHaveCount(0);

		// No script ran: neither the SVG's nor the HTML's.
		expect(await page.title()).toBe(title);
	} finally {
		await dropLibrary(library);
	}
});
