// What the end-to-end tests share: the server's API as the dev admin (to set
// things up around a flow), its emails (Mailpit), fresh accounts.
import type { Page } from '@playwright/test';
import en from '../../messages/en.json' with { type: 'json' };

export { en };

export const server = process.env.THECA_TEST_SERVER ?? 'http://localhost:8093';
const mailpit = process.env.THECA_TEST_MAILPIT ?? 'http://localhost:8095';
/** The second server, never set up, and the storage path it can use. */
export const fresh = process.env.THECA_TEST_FRESH ?? 'http://localhost:8094';
export const freshStorage = process.env.THECA_TEST_FRESH_STORAGE ?? '/files';

export const admin = { email: 'dev@theca.test', password: 'theca-dev-password' };

/** An address no test used yet. */
export function freshEmail(label: string): string {
	return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.theca`;
}

let token: Promise<string> | undefined;

/**
 * The dev admin's session as a Bearer token, read from the login's cookie:
 * the cookie is `Secure`, which a client over plain HTTP doesn't keep.
 */
function adminToken(): Promise<string> {
	token ??= fetch(`${server}/api/v1/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(admin)
	}).then((r) => {
		const cookie = r.headers.get('set-cookie') ?? '';
		const found = /theca_session=([^;]+)/.exec(cookie);
		if (!found) throw new Error(`no session (HTTP ${r.status})`);
		return found[1];
	});
	return token;
}

/** A request as the dev admin; its JSON answer. */
export async function asAdmin<T = unknown>(
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const r = await fetch(`${server}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${await adminToken()}`,
			'Content-Type': 'application/json'
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (!r.ok) throw new Error(`${method} ${path}: HTTP ${r.status} ${await r.text()}`);
	return (r.status === 204 ? undefined : await r.json()) as T;
}

/**
 * The link in the next email to `to` (waiting for it: the server sends every
 * second in tests), as a path of the app. The email is deleted, so the next
 * call waits for the next one.
 */
export async function emailLink(to: string): Promise<string> {
	for (let attempt = 0; attempt < 30; attempt++) {
		const search = await fetch(
			`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`
		);
		const { messages } = (await search.json()) as { messages: { ID: string }[] };
		if (messages.length > 0) {
			const message = await fetch(`${mailpit}/api/v1/message/${messages[0].ID}`);
			const { Text } = (await message.json()) as { Text: string };
			await fetch(`${mailpit}/api/v1/messages`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ IDs: [messages[0].ID] })
			});
			const link = /https?:\/\/\S+\?token=\S+/.exec(Text)?.[0];
			if (!link) throw new Error(`no link in the email to ${to}`);
			const url = new URL(link);
			return url.pathname + url.search;
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error(`no email to ${to}`);
}

/** Logs in through the login page. */
export async function logIn(page: Page, email: string, password: string, next = '/') {
	await page.goto(`/login?next=${encodeURIComponent(next)}`);
	await page.getByLabel(en.email).fill(email);
	await page.getByLabel(en.password).fill(password);
	await page.getByRole('button', { name: en.login_submit }).click();
}

/** A new account, verified (registration opened for it), and its password. */
export async function newAccount(label: string): Promise<{ email: string; password: string }> {
	await asAdmin('PATCH', '/api/v1/admin/settings', { registration: 'open' });
	const account = { email: freshEmail(label), password: 'a test password' };
	await fetch(`${server}/api/v1/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(account)
	});
	const link = new URL(await emailLink(account.email), 'http://app');
	const verified = await fetch(`${server}/api/v1/auth/verify`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token: link.searchParams.get('token') })
	});
	if (!verified.ok) throw new Error(`verify: HTTP ${verified.status}`);
	return account;
}
