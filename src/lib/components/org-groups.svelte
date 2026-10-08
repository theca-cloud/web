<script lang="ts">
	// Library groups: the API's dedup namespaces (decisions.md, Trust
	// boundary), named for what they do. Libraries in a group store identical
	// files once, and their members can then probe each other's files: adding
	// a library is confirmed with that warning; removing one is at once.
	import { invalidate } from '$app/navigation';
	import XIcon from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import NameDialog from '#lib/components/name-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { NativeSelect } from '#lib/components/ui/native-select/index.js';
	import { api, call, type ApiError } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Result } from '#lib/result.js';

	type Group = components['schemas']['Namespace'];
	type Library = components['schemas']['OrganizationLibrary'];

	let {
		organization,
		groups,
		libraries
	}: { organization: string; groups: Group[]; libraries: Library[] } = $props();

	let creating: NameDialog;
	let renaming: NameDialog;
	let renamed = $state<Group>();
	let confirm: ConfirmDialog;

	const nameOf = (id: string) => libraries.find((l) => l.id === id)?.name ?? id;

	async function done(result: Result<unknown, ApiError>) {
		if (!result.ok) toast.error(explain(result.error));
		await invalidate('app:organization');
	}

	async function create(name: string) {
		const params = { path: { id: organization } };
		const result = await call(
			api.POST('/api/v1/organizations/{id}/namespaces', { params, body: { name } })
		);
		if (!result.ok) return explain(result.error);
		await invalidate('app:organization');
	}

	function rename(group: Group) {
		renamed = group;
		renaming.show(group.name);
	}

	async function renameTo(name: string) {
		const params = { path: { id: renamed!.id } };
		const result = await call(api.PATCH('/api/v1/namespaces/{id}', { params, body: { name } }));
		if (!result.ok) return explain(result.error);
		await invalidate('app:organization');
	}

	async function remove(group: Group) {
		const sure = await confirm.ask({
			title: m.group_delete_title({ name: group.name }),
			text: m.group_delete_text(),
			action: m.delete()
		});
		if (!sure) return;
		const params = { path: { id: group.id } };
		await done(await call(api.DELETE('/api/v1/namespaces/{id}', { params })));
	}

	async function addLibrary(group: Group, library: string) {
		const sure = await confirm.ask({
			title: m.group_add_title({ library: nameOf(library), group: group.name }),
			text:
				group.libraries.length === 0
					? m.group_add_first_text()
					: m.group_add_text({
							library: nameOf(library),
							others: new Intl.ListFormat('en').format(group.libraries.map(nameOf))
						}),
			action: m.group_add()
		});
		if (!sure) return;
		const params = { path: { id: group.id, library } };
		await done(await call(api.PUT('/api/v1/namespaces/{id}/libraries/{library}', { params })));
	}

	async function removeLibrary(group: Group, library: string) {
		const params = { path: { id: group.id, library } };
		await done(await call(api.DELETE('/api/v1/namespaces/{id}/libraries/{library}', { params })));
	}
</script>

<p class="text-sm text-muted-foreground">{m.groups_text()}</p>
{#if groups.length === 0}
	<p class="text-sm text-muted-foreground">{m.groups_none()}</p>
{/if}
{#each groups as group (group.id)}
	{@const outside = libraries.filter((l) => !group.libraries.includes(l.id))}
	<div class="grid gap-2 rounded-lg border p-3">
		<div class="flex items-center gap-2">
			<h3 class="flex-1 font-medium">{group.name}</h3>
			<Button variant="ghost" size="sm" onclick={() => rename(group)}>{m.rename()}</Button>
			<Button
				variant="ghost"
				size="sm"
				aria-label="{m.delete()} {group.name}"
				onclick={() => remove(group)}
			>
				{m.delete()}
			</Button>
		</div>
		<ul class="flex flex-wrap gap-1" aria-label={m.group_libraries({ name: group.name })}>
			{#each group.libraries as library (library)}
				<li class="flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-sm">
					{nameOf(library)}
					<Button
						variant="ghost"
						size="icon"
						class="size-5"
						aria-label={m.group_remove({ library: nameOf(library), group: group.name })}
						onclick={() => removeLibrary(group, library)}
					>
						<XIcon />
					</Button>
				</li>
			{:else}
				<li class="text-sm text-muted-foreground">{m.group_empty()}</li>
			{/each}
		</ul>
		{#if outside.length > 0}
			<NativeSelect
				aria-label={m.group_add_to({ name: group.name })}
				value=""
				onchange={(e) => {
					const library = e.currentTarget.value;
					e.currentTarget.value = '';
					if (library) addLibrary(group, library);
				}}
			>
				<option value="">{m.group_add_pick()}</option>
				{#each outside as l (l.id)}
					<option value={l.id}>{l.name}</option>
				{/each}
			</NativeSelect>
		{/if}
	</div>
{/each}
<div>
	<Button size="sm" onclick={() => creating.show()}>{m.group_create()}</Button>
</div>

<NameDialog bind:this={creating} title={m.group_create()} action={m.create()} submit={create} />
<NameDialog bind:this={renaming} title={m.rename()} action={m.rename()} submit={renameTo} />
<ConfirmDialog bind:this={confirm} />
