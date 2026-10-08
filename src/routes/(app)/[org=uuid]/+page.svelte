<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import NameDialog from '#lib/components/name-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	let creating: NameDialog;

	async function create(name: string) {
		const body = { organization: data.organization.organization, name };
		const result = await call(api.POST('/api/v1/libraries', { body }));
		if (!result.ok) return explain(result.error);
		await invalidate('app:libraries');
		await goto(`/${result.data.organization}/${result.data.id}`);
	}
</script>

<div class="grid gap-4 p-4">
	<div>
		<Button onclick={() => creating.show()}>
			<PlusIcon />
			{m.new_library()}
		</Button>
	</div>
	{#if data.libraries.length === 0}
		<p class="text-muted-foreground">{m.organization_empty()}</p>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>{m.name()}</Table.Head>
					<Table.Head class="w-40"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.libraries as library (library.id)}
					<Table.Row>
						<Table.Cell>
							<a
								href="/{library.organization}/{library.id}"
								class="flex items-center gap-2 font-medium hover:underline"
							>
								<LibraryIcon class="size-4 text-muted-foreground" />
								{library.name}
							</a>
						</Table.Cell>
						<Table.Cell class="text-muted-foreground">
							{library.writable ? m.writable() : m.read_only()}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<NameDialog bind:this={creating} title={m.new_library()} action={m.create()} submit={create} />
