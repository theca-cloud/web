<script lang="ts">
	// The app's sidebar (decisions.md, Look): the organizations and their
	// libraries, the account at its foot. Entries to come ("Shared with me",
	// recent files, the trash, search) go in a group above the organizations.
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import NameDialog from '#lib/components/name-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

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
	// A library holds everything in it: trashing one is confirmed first (as the
	// CLI's `rm` does), files and folders aren't (an undo suffices).
	let trashed = $state<Library>();
	let confirming = $state(false);

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

	async function trash() {
		confirming = false;
		const library = trashed!;
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
											<DropdownMenu.Item
												onSelect={() => {
													trashed = library;
													confirming = true;
												}}
											>
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

<Dialog.Root bind:open={confirming}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.trash_library_title()}</Dialog.Title>
			<Dialog.Description>{m.trash_library_text({ name: trashed?.name ?? '' })}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="outline">{m.cancel()}</Button>
				{/snippet}
			</Dialog.Close>
			<Button variant="destructive" onclick={trash}>{m.delete()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
