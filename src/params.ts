import { defineParams } from '@sveltejs/kit/params';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const params = defineParams({
	// A URL segment that is an ID: anything else is the app's 404, never a
	// request with a malformed ID.
	uuid: (param) => (uuid.test(param) ? param : undefined)
});
