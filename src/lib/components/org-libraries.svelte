<script lang="ts">
	// Every library of the organization (the owner's included or not), and who
	// reaches each: its members' roles changed, removed, or added from the
	// organization's members (invited ones too: ready when they accept).
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { NativeSelect } from '#lib/components/ui/native-select/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Library = components['schemas']['OrganizationLibrary'];
	type Member = components['schemas']['Member'];
	type LibraryMember = components['schemas']['LibraryMember'];
	type Role = 'read' | 'write';

	let { libraries, members }: { libraries: Library[]; members: Member[] } = $props();

	let open = $state(false);
	let library = $state<Library>();
	let reach = $state<LibraryMember[]>([]);
	let adding = $state('');
	let addingRole = $state<Role>('write');

	const others = $derived(members.filter((u) => !reach.some((r) => r.user === u.id)));

	async function load(id: string) {
		const params = { path: { id } };
		const result = await call(api.GET('/api/v1/libraries/{id}/members', { params }));
		if (result.ok) {
			reach = result.data;
		} else {
			toast.error(explain(result.error));
		}
	}

	async function show(l: Library) {
		library = l;
		reach = [];
		adding = '';
		await load(l.id);
		open = true;
	}

	async function setRole(user: string, role: Role) {
		const params = { path: { id: library!.id, user } };
		const result = await call(
			api.PUT('/api/v1/libraries/{id}/members/{user}', { params, body: { role } })
		);
		if (!result.ok) toast.error(explain(result.error));
		await load(library!.id);
		await invalidate('app:organization');
	}

	async function remove(user: string) {
		const params = { path: { id: library!.id, user } };
		const result = await call(api.DELETE('/api/v1/libraries/{id}/members/{user}', { params }));
		if (!result.ok) toast.error(explain(result.error));
		await load(library!.id);
		await invalidate('app:organization');
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		if (!adding) return;
		await setRole(adding, addingRole);
		adding = '';
	}
</script>

{#snippet roleSelect(id: string, value: Role, onchange: (role: Role) => void, label: string)}
	<NativeSelect
		{id}
		aria-label={label}
		{value}
		onchange={(e) => onchange(e.currentTarget.value as Role)}
	>
		<option value="read">{m.role_read()}</option>
		<option value="write">{m.role_write()}</option>
	</NativeSelect>
{/snippet}

<Table.Root>
	<Table.Body>
		{#each libraries as l (l.id)}
			<Table.Row>
				<Table.Cell class="font-medium">{l.name}</Table.Cell>
				<Table.Cell class="text-muted-foreground">
					{l.members === 0 ? m.library_nobody() : m.library_members_count({ count: l.members })}
				</Table.Cell>
				<Table.Cell class="text-right">
					<Button
						variant="ghost"
						size="sm"
						aria-label="{m.library_members()} {l.name}"
						onclick={() => show(l)}
					>
						{m.library_members()}
					</Button>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{m.library_members_title({ name: library?.name ?? '' })}</Dialog.Title>
			<Dialog.Description>{m.library_members_text()}</Dialog.Description>
		</Dialog.Header>
		{#if reach.length === 0}
			<p class="text-sm text-muted-foreground">{m.library_nobody()}</p>
		{:else}
			<!-- Rows, not a table: a long address truncates instead of scrolling sideways. -->
			<ul class="grid gap-1">
				{#each reach as r (r.user)}
					<li class="flex items-center gap-2">
						<span class="min-w-0 flex-1 truncate text-sm" title={r.email}>
							{r.email}
							{#if !r.joined}
								<span class="text-xs text-muted-foreground">{m.member_pending()}</span>
							{/if}
						</span>
						{@render roleSelect(
							`role-${r.user}`,
							r.role === 'read' ? 'read' : 'write',
							(role) => setRole(r.user, role),
							`${m.role()} ${r.email}`
						)}
						<Button
							variant="ghost"
							size="sm"
							aria-label="{m.remove()} {r.email}"
							onclick={() => remove(r.user)}
						>
							{m.remove()}
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
		{#if others.length > 0}
			<form class="flex flex-wrap items-center gap-2" onsubmit={add}>
				<NativeSelect
					aria-label={m.library_member_add()}
					bind:value={adding}
					class="min-w-0 flex-1"
				>
					<option value="">{m.library_member_pick()}</option>
					{#each others as u (u.id)}
						<option value={u.id}>{u.email}</option>
					{/each}
				</NativeSelect>
				{@render roleSelect('role-new', addingRole, (role) => (addingRole = role), m.role())}
				<Button size="sm" type="submit" disabled={!adding}>{m.library_member_add()}</Button>
			</form>
		{/if}
		<Dialog.Footer>
			<Button onclick={() => (open = false)}>{m.done()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
