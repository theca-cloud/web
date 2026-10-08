<script lang="ts">
	// The admin's sub-pages (decisions.md: lists run to hundreds of rows), a
	// row of links under the title.
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	let { children }: { children: Snippet } = $props();

	const pages = [
		{ href: '/admin/accounts', label: m.admin_accounts() },
		{ href: '/admin/organizations', label: m.admin_organizations() },
		{ href: '/admin/storages', label: m.admin_storages() },
		{ href: '/admin/providers', label: m.admin_providers() },
		{ href: '/admin/settings', label: m.admin_settings() },
		{ href: '/admin/jobs', label: m.admin_jobs() }
	];
</script>

<div class="grid gap-6 p-6">
	<h1 class="text-lg font-medium">{m.admin()}</h1>
	<nav aria-label={m.admin()} class="flex flex-wrap gap-1 border-b">
		{#each pages as p (p.href)}
			<a
				href={p.href}
				aria-current={page.url.pathname === p.href ? 'page' : undefined}
				class="-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground"
			>
				{p.label}
			</a>
		{/each}
	</nav>
	{@render children()}
</div>
