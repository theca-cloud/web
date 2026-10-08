import { linkEmail } from '#lib/link.js';

export function load({ fetch, url }) {
	return linkEmail(fetch, url);
}
