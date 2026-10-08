<script lang="ts">
	// The account, one page in sections (roadmap 07): its email (never
	// changes), password, two-factor, ways to log in, sessions, app
	// passwords, export, deletion. A restricted session sees only its app
	// passwords (the server refuses it the rest).
	import { goto, invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import AccountAppPasswords from '#lib/components/account-app-passwords.svelte';
	import AccountTotp from '#lib/components/account-totp.svelte';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import NewPassword from '#lib/components/new-password.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { formatDate } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { browserOf } from '#lib/user-agent.js';

	let { data } = $props();

	const hasPassword = $derived(data.identities.some((i) => i.kind === 'password'));
	const linked = $derived(new Set(data.identities.map((i) => i.provider)));

	let confirm: ConfirmDialog;
	let changing: FormDialog;
	let deleting: FormDialog;
	let current = $state('');
	let fresh = $state('');
	let code = $state('');

	function change() {
		current = '';
		fresh = '';
		changing.show();
	}

	async function changePassword() {
		const body = { current, new: fresh };
		const result = await call(api.POST('/api/v1/auth/password', { body }));
		if (!result.ok) return explain(result.error);
		toast(m.password_changed());
		await invalidate('app:account');
	}

	async function setPassword() {
		const body = { email: data.me.email };
		const result = await call(api.POST('/api/v1/auth/password/forgot', { body }));
		if (result.ok) {
			toast(m.password_set_sent());
		} else {
			toast.error(explain(result.error));
		}
	}

	async function unlink(id: string, name: string) {
		const sure = await confirm.ask({
			title: m.identity_remove_title({ name }),
			text: m.identity_remove_text(),
			action: m.remove()
		});
		if (!sure) return;
		const params = { path: { id } };
		const result = await call(api.DELETE('/api/v1/auth/identities/{id}', { params }));
		if (result.ok) {
			await invalidate('app:account');
		} else {
			toast.error(explain(result.error));
		}
	}

	async function link(provider: string) {
		const params = { path: { provider } };
		const result = await call(api.POST('/api/v1/auth/oidc/{provider}/link', { params }));
		if (result.ok) {
			location.href = result.data.url;
		} else {
			toast.error(explain(result.error));
		}
	}

	async function revokeSession(id: string) {
		const params = { path: { id } };
		const result = await call(api.DELETE('/api/v1/auth/sessions/{id}', { params }));
		if (result.ok) {
			await invalidate('app:account');
		} else {
			toast.error(explain(result.error));
		}
	}

	async function exportData() {
		const result = await call(api.GET('/api/v1/me/export'));
		if (!result.ok) {
			toast.error(explain(result.error));
			return;
		}
		const json = JSON.stringify(result.data, null, 2);
		const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
		Object.assign(document.createElement('a'), {
			href: url,
			download: 'theca-export.json'
		}).click();
		URL.revokeObjectURL(url);
	}

	function remove() {
		current = '';
		code = '';
		deleting.show();
	}

	async function deleteAccount() {
		const body = { password: hasPassword ? current : null, totp: data.me.totp ? code : null };
		const result = await call(api.DELETE('/api/v1/me', { body }));
		if (!result.ok) return explain(result.error);
		await goto('/login', { invalidateAll: true });
	}
</script>

{#snippet section(title: string)}
	<h2 class="font-medium">{title}</h2>
{/snippet}

<div class="grid max-w-3xl gap-8 p-6">
	<h1 class="text-lg font-medium">{m.account()}</h1>

	<section class="grid gap-2">
		{@render section(m.email())}
		<p class="text-sm">{data.me.email}</p>
	</section>

	{#if data.restricted}
		<p class="text-sm text-muted-foreground">{m.account_restricted()}</p>
	{:else}
		<section class="grid gap-2">
			{@render section(m.password())}
			<div>
				{#if hasPassword}
					<Button size="sm" variant="outline" onclick={change}>{m.password_change()}</Button>
				{:else}
					<p class="mb-2 text-sm text-muted-foreground">{m.password_none()}</p>
					<Button size="sm" variant="outline" onclick={setPassword}>{m.password_set()}</Button>
				{/if}
			</div>
		</section>

		{#if hasPassword}
			<section class="grid gap-2">
				{@render section(m.totp())}
				<AccountTotp on={data.me.totp} />
			</section>
		{/if}

		<section class="grid gap-2">
			{@render section(m.identities())}
			<Table.Root>
				<Table.Body>
					{#each data.identities as identity (identity.id)}
						{@const name =
							identity.kind === 'password' ? m.password() : (identity.provider_name ?? '')}
						<Table.Row>
							<Table.Cell class="font-medium">{name}</Table.Cell>
							<Table.Cell class="text-right">
								{#if data.identities.length > 1}
									<Button
										variant="ghost"
										size="sm"
										aria-label="{m.remove()} {name}"
										onclick={() => unlink(identity.id, name)}
									>
										{m.remove()}
									</Button>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
			{#if data.providers.some((p) => !linked.has(p.id))}
				<div class="flex flex-wrap gap-2">
					{#each data.providers.filter((p) => !linked.has(p.id)) as provider (provider.id)}
						<Button size="sm" variant="outline" onclick={() => link(provider.id)}>
							{m.identity_link({ name: provider.name })}
						</Button>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	{#if !data.restricted}
		<section class="grid gap-2">
			{@render section(m.sessions())}
			<Table.Root>
				<Table.Body>
					{#each data.sessions as session (session.id)}
						<Table.Row>
							<Table.Cell class="font-medium">
								{browserOf(session.user_agent) ?? session.name}
								{#if session.current}
									<span class="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
										{m.session_current()}
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">{session.ip ?? ''}</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{formatDate(session.last_seen ?? session.created_at)}
							</Table.Cell>
							<Table.Cell class="text-right">
								{#if !session.current}
									<Button
										variant="ghost"
										size="sm"
										aria-label="{m.revoke()} {browserOf(session.user_agent) ?? session.name}"
										onclick={() => revokeSession(session.id)}
									>
										{m.revoke()}
									</Button>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</section>
	{/if}

	<section class="grid gap-2">
		{@render section(m.app_passwords())}
		<AccountAppPasswords
			appPasswords={data.appPasswords}
			organizations={data.me.organizations}
			libraries={data.libraries}
		/>
	</section>

	{#if !data.restricted}
		<section class="grid gap-2">
			{@render section(m.export())}
			<p class="text-sm text-muted-foreground">{m.export_text()}</p>
			<div>
				<Button size="sm" variant="outline" onclick={exportData}>{m.export()}</Button>
			</div>
		</section>

		<section class="grid gap-2">
			{@render section(m.account_delete())}
			<p class="text-sm text-muted-foreground">{m.account_delete_text()}</p>
			<div>
				<Button size="sm" variant="destructive" onclick={remove}>{m.account_delete()}</Button>
			</div>
		</section>
	{/if}
</div>

<FormDialog
	bind:this={changing}
	title={m.password_change()}
	text={m.password_change_text()}
	action={m.password_change()}
	submit={changePassword}
>
	<div class="grid gap-2">
		<Label for="current-password">{m.password_current()}</Label>
		<Input
			id="current-password"
			type="password"
			autocomplete="current-password"
			required
			bind:value={current}
		/>
	</div>
	<NewPassword
		id="new-password"
		bind:value={fresh}
		email={data.me.email}
		level={data.instance.password_strength}
	/>
</FormDialog>

<FormDialog
	bind:this={deleting}
	title={m.account_delete()}
	text={m.account_delete_confirm()}
	action={m.account_delete()}
	destructive
	submit={deleteAccount}
>
	{#if hasPassword}
		<div class="grid gap-2">
			<Label for="delete-password">{m.password()}</Label>
			<Input
				id="delete-password"
				type="password"
				autocomplete="current-password"
				required
				bind:value={current}
			/>
		</div>
	{/if}
	{#if data.me.totp}
		<div class="grid gap-2">
			<Label for="delete-totp">{m.totp_code()}</Label>
			<Input
				id="delete-totp"
				inputmode="numeric"
				autocomplete="one-time-code"
				required
				bind:value={code}
			/>
		</div>
	{/if}
</FormDialog>

<ConfirmDialog bind:this={confirm} />
