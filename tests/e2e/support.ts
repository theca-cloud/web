// What the end-to-end tests share: the server's API as the dev admin (to set
// things up around a flow), its emails (Mailpit), fresh accounts.
import { expect, type Page } from '@playwright/test';
import en from '../../messages/en.json' with { type: 'json' };

export { en };

export const server = process.env.THECA_TEST_SERVER ?? 'http://localhost:8093';
const mailpit = process.env.THECA_TEST_MAILPIT ?? 'http://localhost:8095';
/** The second server, never set up, and the storage path it can use. */
export const fresh = process.env.THECA_TEST_FRESH ?? 'http://localhost:8094';
/** The dev server's storage directory, in its container (writable: new storages go below it). */
export const storageRoot = process.env.THECA_TEST_STORAGE ?? '/files';
export const freshStorage = process.env.THECA_TEST_FRESH_STORAGE ?? '/files';

export const admin = { email: 'dev@theca.test', password: 'theca-dev-password' };

/** An address no test used yet. */
export function freshEmail(label: string): string {
	return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.theca`;
}

/**
 * An account's session as a Bearer token, read from the login's cookie: the
 * cookie is `Secure`, which a client over plain HTTP doesn't keep.
 */
async function tokenOf(account: { email: string; password: string }): Promise<string> {
	const r = await fetch(`${server}/api/v1/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(account)
	});
	const found = /theca_session=([^;]+)/.exec(r.headers.get('set-cookie') ?? '');
	if (!found) throw new Error(`no session (HTTP ${r.status})`);
	return found[1];
}

let token: Promise<string> | undefined;
const adminToken = () => (token ??= tokenOf(admin));

/** A request as an account; its JSON answer. */
export async function as<T = unknown>(
	account: { email: string; password: string },
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	return request<T>(await tokenOf(account), method, path, body);
}

/** A request as the dev admin; its JSON answer. */
export async function asAdmin<T = unknown>(
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	return request<T>(await adminToken(), method, path, body);
}

async function request<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
	const r = await fetch(`${server}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
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

/** Fills the login page in and submits it (whatever the server answers). */
export async function tryLogIn(page: Page, email: string, password: string, next = '/') {
	await page.goto(`/login?next=${encodeURIComponent(next)}`);
	await page.getByLabel(en.email).fill(email);
	await page.getByLabel(en.password).fill(password);
	await page.getByRole('button', { name: en.login_submit }).click();
}

/** Logs in, and waits for the app: navigating at once would cancel the login. */
export async function logIn(page: Page, email: string, password: string, next = '/') {
	await tryLogIn(page, email, password, next);
	await expect(page.getByRole('button', { name: en.account_menu })).toBeVisible();
}

/** A page of an organization: where `/` leads once logged in. */
export const anOrganization = /\/[0-9a-f-]{36}$/;

/** A new account, verified (registration opened for it), and its password. */
export async function newAccount(label: string): Promise<{ email: string; password: string }> {
	await asAdmin('PATCH', '/api/v1/admin/settings', { registration: 'open' });
	const account = { email: freshEmail(label), password: 'correct horse battery staple' };
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

type Library = { id: string; organization: string; root: string; name: string };

/** The dev admin's organization (the company one the setup made). */
export async function adminOrganization(): Promise<string> {
	// The one it owns: tests add it to others.
	const me = await asAdmin<{
		organizations: { organization: string; name: string; owner?: boolean }[];
	}>('GET', '/api/v1/me');
	return me.organizations.find((o) => o.name === 'Dev' && o.owner)!.organization;
}

/** A library of the dev admin's, with folders (`a`, `a/b`) in it. */
export async function newLibrary(label: string, folders: string[] = []): Promise<Library> {
	const name = `${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	const organization = await adminOrganization();
	const library = await asAdmin<Library>('POST', '/api/v1/libraries', { organization, name });
	if (folders.length > 0) {
		await asAdmin('POST', `/api/v1/nodes/${library.root}/folders`, { paths: folders });
	}
	return library;
}

/** A library gone for good (trashed first: only the trash's are purged). */
export async function dropLibrary(library: Library) {
	await asAdmin('DELETE', `/api/v1/libraries/${library.id}`).catch(() => {});
	await asAdmin('DELETE', `/api/v1/libraries/${library.id}?permanent=true`).catch(() => {});
}

/** Bytes that don't compress or dedup with anything else (each test its own seed). */
export function randomBytes(size: number): Buffer {
	const bytes = Buffer.alloc(size);
	for (let i = 0; i < size; i += 65536) {
		crypto.getRandomValues(bytes.subarray(i, Math.min(i + 65536, size)));
	}
	return bytes;
}
