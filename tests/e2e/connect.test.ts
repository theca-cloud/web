import { expect, test } from '@playwright/test';
import { admin, en, logIn, server } from './support';

/** A login flow, started as a device does: its page in the app, its code, its poll. */
async function startFlow(name: string) {
	const r = await fetch(`${server}/api/v1/auth/flows`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name })
	});
	const flow = (await r.json()) as { url: string; poll: string; code: string };
	return { ...flow, path: new URL(flow.url).pathname };
}

/** One poll, as the device does: its status and answer. */
async function poll(token: string) {
	const r = await fetch(`${server}/api/v1/auth/flows/poll`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ poll: token })
	});
	return { status: r.status, body: r.status === 200 ? await r.json() : null };
}

const question = (name: string) => en.connect_question.replace('{name}', name);

test('approving a device: its poll gets an app password, once', async ({ page }) => {
	const name = `laptop ${Date.now()}`;
	const flow = await startFlow(name);
	await logIn(page, admin.email, admin.password);
	await page.goto(flow.path);
	await expect(page).toHaveTitle(/^Connect a device · /);
	await expect(page.getByText(question(name))).toBeVisible();
	await expect(page.getByText(flow.code, { exact: true })).toBeVisible();
	expect((await poll(flow.poll)).status).toBe(202);

	await page.getByRole('button', { name: en.connect_allow }).click();
	await expect(page.getByText(en.connect_done.replace('{name}', name))).toBeVisible();
	const approved = await poll(flow.poll);
	expect(approved.status).toBe(200);
	expect(approved.body.password).toBeTruthy();
	expect(approved.body.app_password.name).toBe(name);
	expect((await poll(flow.poll)).status).toBe(404);

	// The link, used: said so.
	await page.goto(flow.path);
	await expect(page.getByText(en.connect_expired)).toBeVisible();
	await expect(page.getByRole('button', { name: en.connect_allow })).toHaveCount(0);
});

test('an unknown link says so', async ({ page }) => {
	await logIn(page, admin.email, admin.password);
	await page.goto(`/connect/${crypto.randomUUID()}`);
	await expect(page.getByText(en.connect_expired)).toBeVisible();
});

test('without a session, the login first, then back to the device', async ({ page }) => {
	const name = `desktop ${Date.now()}`;
	const flow = await startFlow(name);
	await page.goto(flow.path);
	await expect(page).toHaveURL(`/login?next=${encodeURIComponent(flow.path)}`);
	await page.getByLabel(en.email).fill(admin.email);
	await page.getByLabel(en.password).fill(admin.password);
	await page.getByRole('button', { name: en.login_submit }).click();
	await expect(page).toHaveURL(flow.path);
	await expect(page.getByText(question(name))).toBeVisible();
	await expect(page.getByText(flow.code, { exact: true })).toBeVisible();
	// Cancelling just leaves; the flow is still waiting.
	await page.getByRole('link', { name: en.cancel }).click();
	await expect(page).not.toHaveURL(flow.path);
	expect((await poll(flow.poll)).status).toBe(202);
});
