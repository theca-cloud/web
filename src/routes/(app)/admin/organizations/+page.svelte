<script lang="ts">
	// Every organization: its owner, members and usage; edited (name, quota,
	// suspension, default storage, owner), created for an account, deleted
	// (its name typed).
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import AdminSearch from '#lib/components/admin-search.svelte';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import TypedName from '#lib/components/typed-name.svelte';
	import Usage from '#lib/components/usage.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { NativeSelect } from '#lib/components/ui/native-select/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Organization = components['schemas']['AdminOrganization'];

	let { data } = $props();

	const GIB = 1024 ** 3;

	let editing: FormDialog;
	let creating: FormDialog;
	let deleting: FormDialog;
	let edited = $state<Organization>();
	let name = $state('');
	// In GiB; `null`: none (a number field binds a number).
	let quota = $state<number | null>(null);
	let suspended = $state(false);
	let storage = $state('');
	let owner = $state('');
	let typed = $state('');

	function edit(o: Organization) {
		edited = o;
		name = o.name;
		quota = o.quota ? Math.round((o.quota / GIB) * 100) / 100 : null;
		suspended = o.suspended;
		storage = o.default_storage ?? '';
		owner = o.owner;
		editing.show();
	}

	async function save() {
		const o = edited!;
		const body = {
			name: o.personal || name.trim() === o.name ? undefined : name.trim(),
			quota: quota === null ? null : Math.round(quota * GIB),
			suspended,
			default_storage: storage || null,
			owner: o.personal || owner.trim().toLowerCase() === o.owner.toLowerCase() ? undefined : owner
		};
		const params = { path: { id: o.id } };
		const result = await call(api.PATCH('/api/v1/admin/organizations/{id}', { params, body }));
		if (!result.ok) return explain(result.error);
		await invalidate('app:admin');
	}

	function create() {
		name = '';
		owner = '';
		creating.show();
	}

	async function found() {
		const body = { name: name.trim(), owner: owner.trim() };
		const result = await call(api.POST('/api/v1/admin/organizations', { body }));
		if (!result.ok) return explain(result.error);
		await invalidate('app:admin');
	}

	function remove(o: Organization) {
		edited = o;
		typed = '';
		deleting.show();
	}

	async function erase() {
		if (typed !== edited!.name) return m.typed_mismatch();
		const params = { path: { id: edited!.id } };
		const result = await call(api.DELETE('/api/v1/admin/organizations/{id}', { params }));
		if (!result.ok) return explain(result.error);
		toast(m.organization_deleted({ name: edited!.name }));
		await invalidate('app:admin');
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<div class="flex-1"><AdminSearch q={data.q} label={m.admin_search_organizations()} /></div>
	<Button size="sm" onclick={create}>{m.organization_new()}</Button>
</div>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>{m.name()}</Table.Head>
			<Table.Head>{m.member_owner()}</Table.Head>
			<Table.Head>{m.members()}</Table.Head>
			<Table.Head class="w-56">{m.usage_label()}</Table.Head>
			<Table.Head class="w-40"></Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each data.organizations as o (o.id)}
			<Table.Row>
				<Table.Cell class="font-medium">
					{o.personal ? m.organization_personal({ email: o.owner }) : o.name}
					{#if o.suspended}
						<span class="ml-1 rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
							{m.suspended()}
						</span>
					{/if}
				</Table.Cell>
				<Table.Cell class="text-muted-foreground">{o.owner}</Table.Cell>
				<Table.Cell class="text-muted-foreground tabular-nums">{o.members}</Table.Cell>
				<Table.Cell><Usage used={o.used} quota={o.quota} /></Table.Cell>
				<Table.Cell class="text-right">
					<Button
						variant="ghost"
						size="sm"
						aria-label="{m.edit()} {o.name}"
						onclick={() => edit(o)}
					>
						{m.edit()}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						aria-label="{m.delete()} {o.name}"
						onclick={() => remove(o)}
					>
						{m.delete()}
					</Button>
				</Table.Cell>
			</Table.Row>
		{:else}
			<Table.Row>
				<Table.Cell colspan={5} class="text-muted-foreground">{m.nothing_found()}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

<FormDialog
	bind:this={editing}
	title={m.edit_named({ name: edited?.name ?? '' })}
	action={m.save()}
	submit={save}
>
	{#if !edited?.personal}
		<div class="grid gap-2">
			<Label for="org-name">{m.name()}</Label>
			<Input id="org-name" required bind:value={name} />
		</div>
	{/if}
	<div class="grid gap-2">
		<Label for="org-quota">{m.quota_gib()}</Label>
		<Input
			id="org-quota"
			type="number"
			min="0"
			step="any"
			placeholder={m.quota_none()}
			bind:value={quota}
		/>
	</div>
	<div class="grid gap-2">
		<Label for="org-storage">{m.default_storage()}</Label>
		<NativeSelect id="org-storage" bind:value={storage} class="w-full">
			<option value="">{m.default_storage_instance()}</option>
			{#each data.storages as s (s.id)}
				<option value={s.id}>{s.name}</option>
			{/each}
		</NativeSelect>
	</div>
	{#if !edited?.personal}
		<div class="grid gap-2">
			<Label for="org-owner">{m.member_owner()}</Label>
			<Input id="org-owner" type="email" required bind:value={owner} />
			<p class="text-xs text-muted-foreground">{m.owner_hint()}</p>
		</div>
	{/if}
	<Label class="flex items-center gap-2 font-normal">
		<Checkbox bind:checked={suspended} />
		{m.suspended()}
	</Label>
</FormDialog>

<FormDialog
	bind:this={creating}
	title={m.organization_new()}
	text={m.organization_new_admin_text()}
	action={m.create()}
	submit={found}
>
	<div class="grid gap-2">
		<Label for="new-org-name">{m.name()}</Label>
		<Input id="new-org-name" required bind:value={name} />
	</div>
	<div class="grid gap-2">
		<Label for="new-org-owner">{m.member_owner()}</Label>
		<Input id="new-org-owner" type="email" required bind:value={owner} />
	</div>
</FormDialog>

<FormDialog
	bind:this={deleting}
	title={m.organization_delete_title({ name: edited?.name ?? '' })}
	text={m.organization_delete_text()}
	action={m.delete()}
	destructive
	submit={erase}
>
	<TypedName name={edited?.name ?? ''} label={m.organization_name()} bind:value={typed} />
</FormDialog>
