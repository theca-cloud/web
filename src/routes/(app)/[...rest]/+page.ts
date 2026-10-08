import { error } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';

// Any other address once logged in (a malformed ID, a typo): the app's own
// 404, in its frame, rather than the bare one outside it.
export function load() {
	error(404, m.error_page_not_found());
}
