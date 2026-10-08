<script lang="ts">
	// The organization's login providers (OIDC; one in practice): its logins
	// open sessions restricted to the organization. Each shows the callback URL
	// to register at the provider and the login link to share (the login page
	// lists only instance-wide providers). The secret is written, never shown.
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Provider = components['schemas']['ProviderInfo'];

	let { organization, providers }: { organization: string; providers: Provider[] } = $props();

	let editing: FormDialog;
	let confirm: ConfirmDialog;
	let edited = $state<Provider>();
	let name = $state('');
	let issuer = $state('');
	let clientId = $state('');
	let secret = $state('');
	let enabled = $state(true);

	const link = (p: Provider, end: 'callback' | 'start') =>
		`${location.origin}/api/v1/auth/oidc/${p.id}/${end}`;

	function edit(p?: Provider) {
		edited = p;
		name = p?.name ?? '';
		issuer = p?.issuer ?? '';
		clientId = p?.client_id ?? '';
		secret = '';
		enabled = p?.enabled ?? true;
		editing.show();
	}

	async function submit() {
		const body = {
			name: name.trim(),
			issuer: issuer.trim(),
			client_id: clientId.trim(),
			enabled,
			// Unchanged when left empty (it's never shown back).
			client_secret: secret || null
		};
		const result = edited
			? await call(
					api.PATCH('/api/v1/organizations/{id}/identity-providers/{provider}', {
						params: { path: { id: organization, provider: edited.id } },
						body
					})
				)
			: await call(
					api.POST('/api/v1/organizations/{id}/identity-providers', {
						params: { path: { id: organization } },
						body
					})
				);
		if (!result.ok) return explain(result.error);
		await invalidate('app:organization');
	}

	async function remove(p: Provider) {
		const sure = await confirm.ask({
			title: m.provider_delete_title({ name: p.name }),
			text: m.provider_delete_text(),
			action: m.delete()
		});
		if (!sure) return;
		const params = { path: { id: organization, provider: p.id } };
		const result = await call(
			api.DELETE('/api/v1/organizations/{id}/identity-providers/{provider}', { params })
		);
		if (result.ok) {
			await invalidate('app:organization');
		} else {
			toast.error(explain(result.error));
		}
	}
</script>

<p class="text-sm text-muted-foreground">{m.provider_text()}</p>
{#each providers as p (p.id)}
	<div class="grid gap-2 rounded-lg border p-3 text-sm">
		<div class="flex items-center gap-2">
			<h3 class="flex-1 font-medium">
				{p.name}
				{#if !p.enabled}
					<span class="ml-1 text-xs text-muted-foreground">{m.provider_disabled()}</span>
				{/if}
			</h3>
			<Button variant="ghost" size="sm" onclick={() => edit(p)}>{m.edit()}</Button>
			<Button
				variant="ghost"
				size="sm"
				aria-label="{m.delete()} {p.name}"
				onclick={() => remove(p)}
			>
				{m.delete()}
			</Button>
		</div>
		<p class="text-muted-foreground">{p.issuer}</p>
		<dl class="grid gap-1">
			<dt class="text-muted-foreground">{m.provider_callback()}</dt>
			<dd><code class="font-mono text-xs break-all">{link(p, 'callback')}</code></dd>
			<dt class="text-muted-foreground">{m.provider_login_link()}</dt>
			<dd><code class="font-mono text-xs break-all">{link(p, 'start')}</code></dd>
		</dl>
	</div>
{/each}
<div>
	<Button size="sm" onclick={() => edit()}>{m.provider_add()}</Button>
</div>

<FormDialog
	bind:this={editing}
	title={edited ? m.provider_edit({ name: edited.name }) : m.provider_add()}
	action={edited ? m.save() : m.create()}
	{submit}
>
	<div class="grid gap-2">
		<Label for="provider-name">{m.name()}</Label>
		<Input id="provider-name" required autocomplete="off" bind:value={name} />
	</div>
	<div class="grid gap-2">
		<Label for="provider-issuer">{m.provider_issuer()}</Label>
		<Input
			id="provider-issuer"
			type="url"
			required
			placeholder="https://auth.example.com"
			bind:value={issuer}
		/>
	</div>
	<div class="grid gap-2">
		<Label for="provider-client">{m.provider_client_id()}</Label>
		<Input id="provider-client" required autocomplete="off" bind:value={clientId} />
	</div>
	<div class="grid gap-2">
		<Label for="provider-secret">{m.provider_secret()}</Label>
		<Input
			id="provider-secret"
			type="password"
			autocomplete="off"
			required={!edited}
			placeholder={edited ? m.provider_secret_unchanged() : ''}
			bind:value={secret}
		/>
	</div>
	<Label class="flex items-center gap-2 font-normal">
		<Checkbox bind:checked={enabled} />
		{m.provider_enabled()}
	</Label>
</FormDialog>

<ConfirmDialog bind:this={confirm} />
