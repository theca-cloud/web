import type { HandleClientError } from '@sveltejs/kit/hooks';
import { m } from '#lib/paraglide/messages.js';

// What reaches the error page (a throw in `load` or a render, a `Panic`): the
// details go to the console, the user gets a generic message.
export const handleError: HandleClientError = ({ error }) => {
	console.error(error);
	return { message: m.error_unexpected() };
};
