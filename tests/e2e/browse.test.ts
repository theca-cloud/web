import { expect, test, type Page } from '@playwright/test';
import {
	admin,
	adminOrganization,
	asAdmin,
	dropLibrary,
	en,
	logIn,
	newAccount,
	newLibrary
} from './support';

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

/** A row's menu, then one of its items. */
async function rowAction(page: Page, name: string, action: string) {
	await page.getByRole('button', { name: en.item_menu.replace('{name}', name) }).click();
	await page.getByRole('menuitem', { name: action }).click();
}

test('the frame: sidebar, folders, breadcrumbs, deep links', async ({ page }) => {
	const library = await newLibrary('Frame', ['Inside', 'Inside/Deeper']);
	try {
		await logIn(page, admin.email, admin.password);
		await expect(page).toHaveURL(`/${library.organization}`);
		await page.getByRole('link', { name: library.name }).first().click();
		await expect(page).toHaveURL(`/${library.organization}/${library.id}`);
		await page.getByRole('link', { name: 'Inside' }).click();
		await page.getByRole('link', { name: 'Deeper' }).click();
		await expect(page.getByText(en.folder_empty)).toBeVisible();

		// A deep link, reloaded, opens the same folder; its breadcrumbs lead back up.
		await page.reload();
		await expect(page.getByText(en.folder_empty)).toBeVisible();
		const breadcrumbs = page.getByRole('navigation', { name: 'breadcrumb' });
		await breadcrumbs.getByRole('link', { name: 'Inside' }).click();
		await expect(row(page, 'Deeper')).toBeVisible();
		await breadcrumbs.getByRole('link', { name: library.name }).click();
		await expect(page).toHaveURL(`/${library.organization}/${library.id}`);
	} finally {
		await dropLibrary(library);
	}
});

test('folders: created, renamed, moved, copied, deleted and undone', async ({ page }) => {
	const library = await newLibrary('Ops', ['Target', 'Other']);
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);

		await page.getByRole('button', { name: en.new_folder }).click();
		await page.getByRole('dialog').getByLabel(en.name).fill('Alpha');
		await page.getByRole('button', { name: en.create }).click();
		await expect(row(page, 'Alpha')).toBeVisible();

		// A name taken: said in the dialog, which stays open.
		await rowAction(page, 'Alpha', en.rename);
		await page.getByRole('dialog').getByLabel(en.name).fill('Other');
		await page.getByRole('dialog').getByRole('button', { name: en.rename }).click();
		await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(en.error_name_taken);
		await page.getByRole('dialog').getByLabel(en.name).fill('Beta');
		await page.getByRole('dialog').getByRole('button', { name: en.rename }).click();
		await expect(row(page, 'Beta')).toBeVisible();

		// Moved into Target through the destination dialog.
		await rowAction(page, 'Beta', en.move);
		await page.getByRole('dialog').getByRole('button', { name: 'Target' }).click();
		await page.getByRole('button', { name: en.move_here }).click();
		await expect(row(page, 'Beta')).toHaveCount(0);
		await page.getByRole('link', { name: 'Target' }).click();
		// The folder's listing, not the previous one's last moment.
		await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toContainText('Target');
		await expect(row(page, 'Beta')).toBeVisible();

		// Copied back up: the destination dialog starts here, one level up is the library.
		await rowAction(page, 'Beta', en.copy);
		await page.getByRole('dialog').getByRole('button', { name: library.name }).click();
		await page.getByRole('button', { name: en.copy_here }).click();
		await page.goto(`/${library.organization}/${library.id}`);
		await expect(row(page, 'Beta')).toBeVisible();

		// Two deleted at once, then undone.
		await page.getByRole('checkbox', { name: en.select_item.replace('{name}', 'Beta') }).click();
		await page.getByRole('checkbox', { name: en.select_item.replace('{name}', 'Other') }).click();
		await expect(page.getByText(en.selected.replace('{count}', '2'))).toBeVisible();
		await page.getByRole('button', { name: en.delete }).click();
		await expect(row(page, 'Beta')).toHaveCount(0);
		await expect(row(page, 'Other')).toHaveCount(0);
		await page.getByRole('button', { name: en.undo }).click();
		await expect(row(page, 'Beta')).toBeVisible();
		await expect(row(page, 'Other')).toBeVisible();
	} finally {
		await dropLibrary(library);
	}
});

test('a folder never moves into itself', async ({ page }) => {
	const library = await newLibrary('Itself', ['Outer', 'Outer/Inner']);
	try {
		await logIn(page, admin.email, admin.password, `/${library.organization}/${library.id}`);
		await rowAction(page, 'Outer', en.move);
		await page.getByRole('dialog').getByRole('button', { name: 'Outer' }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Inner' }).click();
		await page.getByRole('button', { name: en.move_here }).click();
		await expect(page.getByText(en.error_move_into_itself)).toBeVisible();
		await expect(row(page, 'Outer')).toBeVisible();
	} finally {
		await dropLibrary(library);
	}
});

test('libraries: created from the sidebar, renamed, trashed and undone', async ({ page }) => {
	const name = `Sidebar ${Date.now()}`;
	await logIn(page, admin.email, admin.password);
	await page.getByRole('button', { name: en.new_library }).first().click();
	await page.getByRole('dialog').getByLabel(en.name).fill(name);
	await page.getByRole('button', { name: en.create }).click();
	await expect(page.getByText(en.library_empty)).toBeVisible();
	const url = new URL(page.url());
	const [, organization, id] = url.pathname.split('/');
	const library = { id, organization, root: '', name };
	try {
		// This library's own item only: other libraries are never touched.
		const item = (label: string) =>
			page.locator('[data-sidebar="menu-item"]').filter({ hasText: label });
		await item(name).hover();
		await item(name).getByRole('button', { name: en.library_menu }).click();
		await page.getByRole('menuitem', { name: en.rename }).click();
		await page.getByRole('dialog').getByLabel(en.name).fill(`${name} renamed`);
		await page.getByRole('dialog').getByRole('button', { name: en.rename }).click();
		const renamed = item(`${name} renamed`);
		await expect(renamed).toBeVisible();
		library.name = `${name} renamed`;

		await renamed.hover();
		await renamed.getByRole('button', { name: en.library_menu }).click();
		await page.getByRole('menuitem', { name: en.delete }).click();
		// Confirmed first: a library holds everything in it.
		await page.getByRole('dialog').getByRole('button', { name: en.delete }).click();
		await expect(page).toHaveURL(`/${organization}`);
		await expect(renamed).toHaveCount(0);
		await page.getByRole('button', { name: en.undo }).click();
		await expect(renamed).toBeVisible();
	} finally {
		await dropLibrary(library);
	}
});

test('a read-only member sees no write action', async ({ page }) => {
	const library = await newLibrary('Read', ['Folder']);
	try {
		const reader = await newAccount('reader');
		const organization = await adminOrganization();
		const member = await asAdmin<{ id: string }>(
			'POST',
			`/api/v1/organizations/${organization}/members`,
			{ email: reader.email }
		);
		await asAdmin('PUT', `/api/v1/libraries/${library.id}/members/${member.id}`, { role: 'read' });

		await logIn(page, reader.email, reader.password, `/${library.organization}/${library.id}`);
		await expect(row(page, 'Folder')).toBeVisible();
		await expect(page.getByRole('button', { name: en.new_folder })).toHaveCount(0);
		await page.getByRole('button', { name: en.item_menu.replace('{name}', 'Folder') }).click();
		await expect(page.getByRole('menuitem', { name: en.copy })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: en.rename })).toHaveCount(0);
		await expect(page.getByRole('menuitem', { name: en.delete })).toHaveCount(0);
	} finally {
		await dropLibrary(library);
	}
});

test('a 404 stays in the frame, with a way back', async ({ page }) => {
	await logIn(page, admin.email, admin.password);
	const organization = await adminOrganization();
	for (const path of ['/not-an-id', `/${organization}/01a1181b-0000-7000-8000-000000000000`]) {
		await page.goto(path);
		await expect(page.getByText(en.error_page_not_found)).toBeVisible();
		await expect(page.getByRole('button', { name: en.account_menu })).toBeVisible();
	}
	await page.getByRole('link', { name: en.back_home }).click();
	await expect(page).toHaveURL(`/${organization}`);
});
