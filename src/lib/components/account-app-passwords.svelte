<script lang="ts">
	// App passwords (WebDAV, the CLI, API clients): listed with their scope,
	// created (the password shown once, with what it's for), revoked.
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { formatDate } from '#lib/format.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type AppPassword = components['schemas']['AppPassword'];
	type Library = components['schemas']['Library'];
	type Membership = components['schemas']['Membership'];

	let {
		appPasswords,
		organizations,
		libraries
	}: { appPasswords: AppPassword[]; organizations: Membership[]; libraries: Library[] } = $props();

	let creating: FormDialog;
	let confirm: ConfirmDialog;
	let name = $state('');
	// '' (everything), `o:<id>` (an organization), `l:<id>` (a library).
	let scope = $state('');
	let readOnly = $state(false);
	let created = $state<string>();

	const orgName = (id: string) => {
		const org = organizations.find((o) => o.organization === id);
		return org?.personal ? m.my_files() : (org?.name ?? id);
	};

	function scopeOf(p: AppPassword) {
		if (p.library) return libraries.find((l) => l.id === p.library)?.name ?? p.library;
		if (p.organization) return orgName(p.organization);
		return m.app_password_everything();
	}

	function create() {
		name = '';
		scope = '';
		readOnly = false;
		creating.show();
	}

	async function submit() {
		const [kind, id] = scope.split(':');
		const body = {
			name: name.trim(),
			read_only: readOnly,
			organization: kind === 'o' ? id : null,
			library: kind === 'l' ? id : null
		};
		const result = await call(api.POST('/api/v1/auth/app-passwords', { body }));
		if (!result.ok) return explain(result.error);
		created = result.data.password;
		await invalidate('app:account');
	}

	async function revoke(p: AppPassword) {
		const sure = await confirm.ask({
			title: m.app_password_revoke_title({ name: p.name }),
			text: m.app_password_revoke_text(),
			action: m.revoke()
		});
		if (!sure) return;
		const params = { path: { id: p.id } };
		const result = await call(api.DELETE('/api/v1/auth/app-passwords/{id}', { params }));
		if (result.ok) {
			await invalidate('app:account');
		} else {
			toast.error(explain(result.error));
		}
	}
</script>

{#if appPasswords.length > 0}
	<Table.Root>
		<Table.Body>
			{#each appPasswords as p (p.id)}
				<Table.Row>
					<Table.Cell class="font-medium">{p.name}</Table.Cell>
					<Table.Cell class="text-muted-foreground">
						{scopeOf(p)}{#if p.read_only}&nbsp;· {m.read_only()}{/if}
					</Table.Cell>
					<Table.Cell class="text-muted-foreground">
						{p.last_seen ? m.last_used({ date: formatDate(p.last_seen) }) : m.never_used()}
					</Table.Cell>
					<Table.Cell class="text-right">
						<Button
							variant="ghost"
							size="sm"
							aria-label="{m.revoke()} {p.name}"
							onclick={() => revoke(p)}
						>
							{m.revoke()}
						</Button>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
{:else}
	<p class="text-sm text-muted-foreground">{m.app_passwords_none()}</p>
{/if}
<div>
	<Button size="sm" onclick={create}>{m.app_password_create()}</Button>
</div>

<FormDialog
	bind:this={creating}
	title={m.app_password_create()}
	text={m.app_password_text()}
	action={m.create()}
	{submit}
>
	<div class="grid gap-2">
		<Label for="app-password-name">{m.name()}</Label>
		<Input id="app-password-name" required autocomplete="off" bind:value={name} />
	</div>
	<div class="grid gap-2">
		<Label for="app-password-scope">{m.app_password_scope()}</Label>
		<select
			id="app-password-scope"
			bind:value={scope}
			class="h-9 rounded-md border bg-transparent px-2 text-sm"
		>
			<option value="">{m.app_password_everything()}</option>
			{#each organizations.filter((o) => o.joined) as org (org.organization)}
				<option value="o:{org.organization}">{orgName(org.organization)}</option>
				{#each libraries.filter((l) => l.organization === org.organization) as library (library.id)}
					<option value="l:{library.id}">{orgName(org.organization)} / {library.name}</option>
				{/each}
			{/each}
		</select>
	</div>
	<Label class="flex items-center gap-2 font-normal">
		<Checkbox bind:checked={readOnly} />
		{m.read_only()}
	</Label>
</FormDialog>

<Dialog.Root open={created !== undefined} onOpenChange={(open) => !open && (created = undefined)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.app_password_created()}</Dialog.Title>
			<Dialog.Description>{m.app_password_once()}</Dialog.Description>
		</Dialog.Header>
		<code
			class="rounded-lg border bg-muted p-3 font-mono text-sm break-all"
			aria-label={m.app_password()}>{created}</code
		>
		<p class="text-sm text-muted-foreground">
			{m.app_password_usage({ dav: `${location.origin}/dav/` })}
		</p>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => navigator.clipboard.writeText(created ?? '')}>
				{m.copy_to_clipboard()}
			</Button>
			<Button onclick={() => (created = undefined)}>{m.done()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog bind:this={confirm} />
