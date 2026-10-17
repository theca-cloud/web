import type { page as current } from '$app/state';
import type { RouteId } from '$app/types';
import type { Crumb } from '#lib/crumbs.js';
import { m } from '#lib/paraglide/messages.js';

export type Page = typeof current;

// Pages without crumbs, or whose last crumb isn't name enough.
const named: Partial<Record<RouteId, (page: Page) => string>> = {
	'/(public)/login': () => m.login_title(),
	'/(public)/register': () => m.register_title(),
	'/(public)/reset': () => m.reset_title(),
	'/(public)/verify': () => m.verify_title(),
	'/(public)/invite': () => m.invite_title(),
	'/(public)/setup': () => m.setup_title(),
	'/(app)/account': () => m.account(),
	'/(app)/[org=uuid]/settings': (page) =>
		m.organization_settings_title({ name: page.data.organization.name })
};

/**
 * The tab's title, `<page> · <instance>` (decisions.md, Look): the page's
 * name, else its last crumb (a library's current folder, an admin page); the
 * status on the error page; the instance name alone when there is no name.
 */
export function title(page: Page) {
	const crumbs = (page.data.crumbs ?? []) as Crumb[];
	const name = page.error
		? String(page.status)
		: ((page.route.id && named[page.route.id as RouteId]?.(page)) ?? crumbs.at(-1)?.label);
	const instance = (page.data.instance?.name as string | undefined) ?? m.app_name();
	return name ? m.tab_title({ page: name, instance }) : instance;
}
