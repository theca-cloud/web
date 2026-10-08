<script lang="ts">
	// A company organization's settings, its owner's only (roadmap 08), one
	// page in sections: name, members, libraries and who reaches them, library
	// groups, login provider, ownership, deletion (at once, no trash: its name
	// typed to confirm).
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import TypedName from '#lib/components/typed-name.svelte';
	import OrgGroups from '#lib/components/org-groups.svelte';
	import OrgLibraries from '#lib/components/org-libraries.svelte';
	import OrgMembers from '#lib/components/org-members.svelte';
	import IdentityProviders from '#lib/components/identity-providers.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { NativeSelect } from '#lib/components/ui/native-select/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	const id = $derived(data.organization.organization);
	const heirs = $derived(data.members.filter((u) => u.joined && !u.owner));

	// Edited in place; back to the saved name when it changes.
	let name = $derived(data.organization.name);
	let transferring: FormDialog;
	let deleting: FormDialog;
	let heir = $state('');
	let typed = $state('');

	async function rename(event: SubmitEvent) {
		event.preventDefault();
		const params = { path: { id } };
		const result = await call(
			api.PATCH('/api/v1/organizations/{id}', { params, body: { name: name.trim() } })
		);
		if (result.ok) {
			toast(m.organization_renamed());
			await invalidateAll();
		} else {
			toast.error(explain(result.error));
		}
	}

	function transfer() {
		heir = '';
		transferring.show();
	}

	async function transferTo() {
		const params = { path: { id } };
		const result = await call(
			api.POST('/api/v1/organizations/{id}/owner', { params, body: { member: heir } })
		);
		if (!result.ok) return explain(result.error);
		await goto(`/${id}`, { invalidateAll: true });
	}

	function remove() {
		typed = '';
		deleting.show();
	}

	async function deleteOrganization() {
		if (typed !== data.organization.name) return m.typed_mismatch();
		const params = { path: { id } };
		const result = await call(api.DELETE('/api/v1/organizations/{id}', { params }));
		if (!result.ok) return explain(result.error);
		await goto('/', { invalidateAll: true });
	}
</script>

{#snippet section(title: string)}
	<h2 class="font-medium">{title}</h2>
{/snippet}

<div class="grid max-w-3xl gap-8 p-6">
	<h1 class="text-lg font-medium">{m.organization_settings()}</h1>

	<section class="grid gap-2">
		{@render section(m.name())}
		<form class="flex max-w-md gap-2" onsubmit={rename}>
			<Input aria-label={m.organization_name()} required bind:value={name} />
			<Button type="submit" variant="outline" disabled={name.trim() === data.organization.name}>
				{m.save()}
			</Button>
		</form>
	</section>

	<section class="grid gap-2">
		{@render section(m.members())}
		<OrgMembers organization={id} members={data.members} />
	</section>

	<section class="grid gap-2">
		{@render section(m.libraries())}
		<OrgLibraries libraries={data.libraries} members={data.members} />
	</section>

	<section class="grid gap-2">
		{@render section(m.groups())}
		<OrgGroups organization={id} groups={data.groups} libraries={data.libraries} />
	</section>

	<section class="grid gap-2">
		{@render section(m.provider())}
		<IdentityProviders
			providers={data.providers}
			text={m.provider_text()}
			save={(body, provider) =>
				provider
					? call(
							api.PATCH('/api/v1/organizations/{id}/identity-providers/{provider}', {
								params: { path: { id, provider } },
								body
							})
						)
					: call(
							api.POST('/api/v1/organizations/{id}/identity-providers', {
								params: { path: { id } },
								body
							})
						)}
			remove={(provider) =>
				call(
					api.DELETE('/api/v1/organizations/{id}/identity-providers/{provider}', {
						params: { path: { id, provider } }
					})
				)}
		/>
	</section>

	<section class="grid gap-2">
		{@render section(m.ownership())}
		<p class="text-sm text-muted-foreground">{m.ownership_text()}</p>
		<div>
			<Button size="sm" variant="outline" disabled={heirs.length === 0} onclick={transfer}>
				{m.ownership_transfer()}
			</Button>
		</div>
	</section>

	<section class="grid gap-2">
		{@render section(m.organization_delete())}
		<p class="text-sm text-muted-foreground">{m.organization_delete_text()}</p>
		<div>
			<Button size="sm" variant="destructive" onclick={remove}>{m.organization_delete()}</Button>
		</div>
	</section>
</div>

<FormDialog
	bind:this={transferring}
	title={m.ownership_transfer()}
	text={m.ownership_transfer_text()}
	action={m.ownership_transfer()}
	destructive
	submit={transferTo}
>
	<div class="grid gap-2">
		<Label for="heir">{m.ownership_to()}</Label>
		<NativeSelect id="heir" required bind:value={heir} class="w-full">
			<option value="" disabled>{m.library_member_pick()}</option>
			{#each heirs as u (u.id)}
				<option value={u.id}>{u.email}</option>
			{/each}
		</NativeSelect>
	</div>
</FormDialog>

<FormDialog
	bind:this={deleting}
	title={m.organization_delete_title({ name: data.organization.name })}
	text={m.organization_delete_confirm()}
	action={m.organization_delete()}
	destructive
	submit={deleteOrganization}
>
	<TypedName name={data.organization.name} label={m.organization_name()} bind:value={typed} />
</FormDialog>
