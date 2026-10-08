<script lang="ts">
	// Every account: made or unmade admin, suspended or lifted, deleted (its
	// email typed: someone else's data, decisions.md).
	import { invalidate } from '$app/navigation';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import { toast } from 'svelte-sonner';
	import AdminSearch from '#lib/components/admin-search.svelte';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import TypedName from '#lib/components/typed-name.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { formatDate } from '#lib/format.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Account = components['schemas']['AdminAccount'];

	let { data } = $props();

	let deleting: FormDialog;
	let doomed = $state<Account>();
	let typed = $state('');

	async function update(account: Account, body: { instance_admin?: boolean; suspended?: boolean }) {
		const params = { path: { id: account.id } };
		const result = await call(api.PATCH('/api/v1/admin/accounts/{id}', { params, body }));
		if (!result.ok) toast.error(explain(result.error));
		await invalidate('app:admin');
	}

	function remove(account: Account) {
		doomed = account;
		typed = '';
		deleting.show();
	}

	async function erase() {
		if (typed !== doomed!.email) return m.typed_mismatch();
		const params = { path: { id: doomed!.id } };
		const result = await call(api.DELETE('/api/v1/admin/accounts/{id}', { params }));
		if (!result.ok) return explain(result.error);
		toast(m.account_deleted({ email: doomed!.email }));
		await invalidate('app:admin');
	}
</script>

{#snippet badge(text: string, tone = 'bg-accent text-accent-foreground')}
	<span class={['ml-1 rounded px-1.5 py-0.5 text-xs', tone]}>{text}</span>
{/snippet}

<AdminSearch q={data.q} label={m.admin_search_accounts()} />

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>{m.email()}</Table.Head>
			<Table.Head>{m.admin_created()}</Table.Head>
			<Table.Head class="w-12"></Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each data.accounts as account (account.id)}
			<Table.Row>
				<Table.Cell class="font-medium">
					{account.email}
					{#if account.instance_admin}{@render badge(m.admin_badge())}{/if}
					{#if account.suspended}{@render badge(
							m.suspended(),
							'bg-destructive/10 text-destructive'
						)}{/if}
					{#if !account.verified}{@render badge(
							m.unverified(),
							'bg-muted text-muted-foreground'
						)}{/if}
				</Table.Cell>
				<Table.Cell class="text-muted-foreground">{formatDate(account.created_at)}</Table.Cell>
				<Table.Cell class="text-right">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="ghost"
									size="icon"
									aria-label={m.actions_for({ name: account.email })}
								>
									<EllipsisIcon />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item
								onSelect={() => update(account, { instance_admin: !account.instance_admin })}
							>
								{account.instance_admin ? m.admin_unmake() : m.admin_make()}
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onSelect={() => update(account, { suspended: !account.suspended })}
							>
								{account.suspended ? m.lift() : m.suspend()}
							</DropdownMenu.Item>
							<DropdownMenu.Item variant="destructive" onSelect={() => remove(account)}>
								{m.delete()}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Table.Cell>
			</Table.Row>
		{:else}
			<Table.Row>
				<Table.Cell colspan={3} class="text-muted-foreground">{m.nothing_found()}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

<FormDialog
	bind:this={deleting}
	title={m.account_delete_title({ email: doomed?.email ?? '' })}
	text={m.account_delete_admin_text()}
	action={m.delete()}
	destructive
	submit={erase}
>
	<TypedName name={doomed?.email ?? ''} label={m.email()} bind:value={typed} />
</FormDialog>
