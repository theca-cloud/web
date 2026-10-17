<script lang="ts">
	import { page } from '$app/state';
	import AppSidebar from '#lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '#lib/components/ui/breadcrumb/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import TransferPanel from '#lib/components/transfer-panel.svelte';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import type { Crumb } from '#lib/crumbs.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data, children } = $props();

	// Each page's own, from its `load`.
	const crumbs = $derived((page.data.crumbs ?? []) as Crumb[]);
</script>

<Sidebar.Provider>
	<AppSidebar me={data.me} libraries={data.libraries} instanceName={data.instance.name} />
	<Sidebar.Inset>
		<div class="flex h-12 items-center gap-2 border-b px-4">
			<Sidebar.Trigger aria-label={m.open_sidebar()} class="-ml-1" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					{#each crumbs as crumb, i (i)}
						{#if i > 0}
							<Breadcrumb.Separator />
						{/if}
						<Breadcrumb.Item>
							{#if crumb.href && i < crumbs.length - 1}
								<Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
							{:else}
								<Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
							{/if}
						</Breadcrumb.Item>
					{/each}
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>
<TransferPanel />
<Toaster />
