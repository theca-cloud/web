<script lang="ts">
	// The shared storages: one made the default (new libraries go there), one
	// added (the setup's fields; the server tests it first). None edited or
	// removed: the API has neither (a storage holding chunks can't go).
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import StorageFields from '#lib/components/storage-fields.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { formatSize } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	let adding: FormDialog;
	let fields: StorageFields;

	async function makeDefault(id: string) {
		const params = { path: { id } };
		const result = await call(api.POST('/api/v1/admin/storages/{id}/default', { params }));
		if (!result.ok) toast.error(explain(result.error));
		await invalidate('app:admin');
	}

	async function add() {
		const result = await call(api.POST('/api/v1/admin/storages', { body: fields.value() }));
		if (!result.ok) return explain(result.error);
		await invalidate('app:admin');
	}
</script>

<div>
	<Button size="sm" onclick={() => adding.show()}>{m.storage_add()}</Button>
</div>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>{m.name()}</Table.Head>
			<Table.Head>{m.storage_kind()}</Table.Head>
			<Table.Head class="text-right">{m.storage_chunks()}</Table.Head>
			<Table.Head class="text-right">{m.usage_label()}</Table.Head>
			<Table.Head class="w-40"></Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each data.storages as s (s.id)}
			<Table.Row>
				<Table.Cell class="font-medium">
					{s.name}
					{#if s.default}
						<span class="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
							{m.storage_default()}
						</span>
					{/if}
				</Table.Cell>
				<Table.Cell class="text-muted-foreground">
					{s.implementation === 's3' ? m.setup_s3() : m.setup_filesystem()}
				</Table.Cell>
				<Table.Cell class="text-right text-muted-foreground tabular-nums">{s.chunks}</Table.Cell>
				<Table.Cell class="text-right text-muted-foreground tabular-nums">
					{formatSize(s.used)}
				</Table.Cell>
				<Table.Cell class="text-right">
					{#if !s.default}
						<Button
							variant="ghost"
							size="sm"
							aria-label="{m.storage_make_default()} {s.name}"
							onclick={() => makeDefault(s.id)}
						>
							{m.storage_make_default()}
						</Button>
					{/if}
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

<FormDialog
	bind:this={adding}
	title={m.storage_add()}
	text={m.storage_add_text()}
	action={m.storage_add()}
	submit={add}
>
	<StorageFields
		bind:this={fields}
		name=""
		test={(body) => call(api.POST('/api/v1/admin/storages/test', { body }))}
	/>
</FormDialog>
