/**
 * Where to go after logging in: `next` if it's a page of this app (a path
 * starting with one `/`), `/` otherwise: never another site (an open
 * redirect through the login page).
 */
export function safeNext(next: string | null): string {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
		return '/';
	}
	return next;
}
