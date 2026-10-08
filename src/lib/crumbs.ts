/** A step of a page's breadcrumbs (its `load` returns them as `crumbs`): the last is the page itself. */
export type Crumb = { label: string; href?: string };
