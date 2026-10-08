<script lang="ts">
	// The app's sidebar (decisions.md, Look): the organizations and their
	// libraries, the account at its foot. Entries to come ("Shared with me",
	// recent files, the trash, search) go in a group above the organizations.
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import CircleUserIcon from '@lucide/svelte/icons/circle-user';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import NameDialog from '#lib/components/name-dialog.svelte';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';
	import { scopeHere, scopeQuery } from '#lib/scope.js';

	type Library = components['schemas']['Library'];
	type Me = components['schemas']['Me'];

	let { me, libraries }: { me: Me; libraries: Library[] } = $props();

	// The personal organization first, as "My files"; invitations not accepted are left out.
	const organizations = $derived(
		me.organizations
			.filter((o) => o.joined)
			.toSorted((a, b) => Number(b.personal) - Number(a.personal))
	);

	let creating: NameDialog;
	let renaming: NameDialog;
	let createIn = $state('');
	let renamed = $state<Library>();
	let confirm: ConfirmDialog;

	// Search and trash follow where the user is (decisions.md).
	const here = $derived(new URLSearchParams(scopeQuery(scopeHere(page.data))));
	let query = $state('');

	function search(event: SubmitEvent) {
		event.preventDefault();
		const q = new URLSearchParams({ q: query.trim() });
		goto(`/search?${q}&${here}`);
	}

	async function create(name: string) {
		const body = { organization: createIn, name };
		const result = await call(api.POST('/api/v1/libraries', { body }));
		if (!result.ok) return explain(result.error);
		await invalidate('app:libraries');
		await goto(`/${result.data.organization}/${result.data.id}`);
	}

	async function rename(name: string) {
		const library = renamed!;
		const params = { path: { id: library.id } };
		const result = await call(api.PATCH('/api/v1/libraries/{id}', { params, body: { name } }));
		if (!result.ok) return explain(result.error);
		await invalidate('app:libraries');
	}

	// A library holds everything in it: trashing one is confirmed first (as the
	// CLI's `rm` does); files and folders aren't (an undo suffices).
	async function trash(library: Library) {
		const confirmed = await confirm.ask({
			title: m.trash_library_title(),
			text: m.trash_library_text({ name: library.name }),
			action: m.delete()
		});
		if (!confirmed) return;
		const params = { path: { id: library.id } };
		const result = await call(api.DELETE('/api/v1/libraries/{id}', { params }));
		if (!result.ok) {
			toast.error(explain(result.error));
			return;
		}
		toast(m.trashed_one({ name: library.name }), {
			action: { label: m.undo(), onClick: () => restore(library) }
		});
		if (page.params.lib === library.id) {
			await goto(`/${library.organization}`);
		}
		await invalidate('app:libraries');
	}

	async function restore(library: Library) {
		const params = { path: { id: library.id } };
		const result = await call(api.POST('/api/v1/libraries/{id}/restore', { params }));
		if (result.ok) {
			toast(m.restored());
			await invalidate('app:libraries');
		} else {
			toast.error(explain(result.error));
		}
	}

	async function logout() {
		const result = await call(api.POST('/api/v1/auth/logout'));
		// A session already gone (401): logged out all the same.
		if (result.ok || result.error.status === 401) {
			await goto('/login', { invalidateAll: true });
		} else {
			toast.error(explain(result.error));
		}
	}
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<form role="search" onsubmit={search}>
			<label class="relative block">
				<span class="sr-only">{m.search()}</span>
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Sidebar.Input class="pl-8" placeholder={m.search_placeholder()} bind:value={query} />
			</label>
		</form>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each organizations as organization (organization.organization)}
			{@const name = organization.personal ? m.my_files() : organization.name}
			<Sidebar.Group>
				<Sidebar.GroupLabel>
					{#snippet child({ props })}
						<a href="/{organization.organization}" {...props}>{name}</a>
					{/snippet}
				</Sidebar.GroupLabel>
				<Sidebar.GroupAction
					aria-label={m.new_library()}
					title={m.new_library()}
					onclick={() => {
						createIn = organization.organization;
						creating.show();
					}}
				>
					<PlusIcon />
				</Sidebar.GroupAction>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each libraries.filter((l) => l.organization === organization.organization) as library (library.id)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={page.params.lib === library.id}>
									{#snippet child({ props })}
										<a href="/{library.organization}/{library.id}" {...props}>
											<LibraryIcon />
											<span>{library.name}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
								{#if library.writable}
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Sidebar.MenuAction {...props} showOnHover aria-label={m.library_menu()}>
													<EllipsisIcon />
												</Sidebar.MenuAction>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content side="right" align="start">
											<DropdownMenu.Item
												onSelect={() => {
													renamed = library;
													renaming.show(library.name);
												}}
											>
												{m.rename()}
											</DropdownMenu.Item>
											<DropdownMenu.Item onSelect={() => trash(library)}>
												{m.delete()}
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								{/if}
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton isActive={page.url.pathname === '/trash'}>
					{#snippet child({ props })}
						<a href="/trash?{here}" {...props}>
							<Trash2Icon />
							<span>{m.trash()}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton {...props} aria-label={m.account_menu()}>
								<span>{me.email}</span>
								<ChevronsUpDownIcon class="ml-auto" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content side="top" align="start">
						<DropdownMenu.Item onSelect={() => goto('/account')}>
							<CircleUserIcon />
							{m.account()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onSelect={() => goto('/about')}>
							<InfoIcon />
							{m.about_title()}
						</DropdownMenu.Item>
						<DropdownMenu.Item onSelect={logout}>
							<LogOutIcon />
							{m.logout()}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>

<NameDialog bind:this={creating} title={m.new_library()} action={m.create()} submit={create} />
<NameDialog bind:this={renaming} title={m.rename()} action={m.rename()} submit={rename} />

<ConfirmDialog bind:this={confirm} />
