<script lang="ts">
	// A folder as a table (decisions.md, Look): folders first, sortable by
	// column; actions on a row (its menu) or on the checked rows (the bar
	// above). Every change is one request whatever the count, each item its
	// own outcome: failures in one toast, the others done.
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import FileIcon from '@lucide/svelte/icons/file';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
	import FolderUpIcon from '@lucide/svelte/icons/folder-up';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import NameDialog from '#lib/components/name-dialog.svelte';
	import NodeActions from '#lib/components/node-actions.svelte';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { download } from '#lib/download.js';
	import { dropped } from '#lib/drop.js';
	import { explain } from '#lib/errors.js';
	import { formatDate, formatSize } from '#lib/format.js';
	import type { Node } from '#lib/nodes.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';
	import { transfers } from '#lib/transfers.svelte.js';

	type Library = components['schemas']['Library'];
	type NodeInfo = components['schemas']['NodeInfo'];

	let {
		library,
		folder,
		children,
		destinations
	}: {
		library: Library;
		folder: NodeInfo;
		children: Node[];
		/** The organization's libraries a move or copy may go to. */
		destinations: Library[];
	} = $props();

	const base = $derived(`/${library.organization}/${library.id}`);

	// Sorting, in the browser: the server's order (folders first, by name)
	// until a column is clicked; folders stay first.
	type Key = 'name' | 'size' | 'modified';
	let sortKey = $state<Key>();
	let ascending = $state(true);
	const rows = $derived(sortKey ? children.toSorted(compare) : children);

	function compare(a: Node, b: Node): number {
		if (a.is_file !== b.is_file) return a.is_file ? 1 : -1;
		const order =
			sortKey === 'size'
				? (a.size ?? 0) - (b.size ?? 0)
				: sortKey === 'modified'
					? (a.modified ?? '').localeCompare(b.modified ?? '')
					: a.name.localeCompare(b.name);
		return ascending ? order : -order;
	}

	function sortBy(key: Key) {
		ascending = sortKey === key ? !ascending : true;
		sortKey = key;
	}

	function ariaSort(key: Key) {
		if (sortKey !== key) return undefined;
		return ascending ? 'ascending' : 'descending';
	}

	// Checked rows (only those still listed count).
	let selected = $state<string[]>([]);
	const chosen = $derived(children.filter((c) => selected.includes(c.id)));
	const everything = $derived(children.length > 0 && chosen.length === children.length);

	let newFolder: NameDialog;
	let actions: NodeActions;

	/** Where this folder is (the folders below the root), for moves and copies to start there. */
	const trail = $derived.by(() => {
		const above = (folder.ancestors ?? []).filter((a) => a.name !== '');
		return folder.parent ? [...above, { id: folder.id, name: folder.name }] : above;
	});

	// Uploads into this folder: picked files, a picked folder, or a drop.
	let dragging = $state(false);

	function upload(entries: { path: string; file: File }[], folders: string[] = []) {
		if (entries.length > 0 || folders.length > 0) {
			transfers.upload(entries, folders, library.id, folder.id);
		}
	}

	function picked(input: HTMLInputElement) {
		// A picked folder's files come with their path from it (`folder/a.txt`).
		const files = [...(input.files ?? [])];
		upload(files.map((file) => ({ path: file.webkitRelativePath || file.name, file })));
		input.value = '';
	}

	function ondragover(event: DragEvent) {
		if (!library.writable || !event.dataTransfer?.types.includes('Files')) return;
		event.preventDefault();
		dragging = true;
	}

	async function ondrop(event: DragEvent) {
		if (!library.writable || !event.dataTransfer) return;
		event.preventDefault();
		dragging = false;
		const result = await dropped(event.dataTransfer);
		if (result.ok) {
			upload(result.data.entries, result.data.folders);
		} else {
			toast.error(m.error_unknown({ message: result.error }));
		}
	}

	async function refresh() {
		selected = [];
		await invalidate('app:folder');
	}

	async function createFolder(name: string) {
		if (name.includes('/')) return explain({ status: 400, code: 'name_invalid', message: '' });
		const params = { path: { id: folder.id } };
		const result = await call(
			api.POST('/api/v1/nodes/{id}/folders', { params, body: { paths: [name] } })
		);
		if (!result.ok) return explain(result.error);
		// `mkdir -p`: an existing folder is kept, which here means the name is taken.
		if (!result.data[0].created) return m.error_name_taken();
		await refresh();
	}
</script>

{#snippet sortable(key: Key, label: string)}
	<button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => sortBy(key)}>
		{label}
		{#if sortKey === key}
			{#if ascending}<ArrowUpIcon class="size-3" />{:else}<ArrowDownIcon class="size-3" />{/if}
		{/if}
	</button>
{/snippet}

<div
	class={[
		'flex flex-1 flex-col gap-3 p-4',
		dragging && 'bg-accent outline-2 -outline-offset-4 outline-primary outline-dashed'
	]}
	role="region"
	aria-label={m.drop_here()}
	{ondragover}
	ondragleave={() => (dragging = false)}
	{ondrop}
>
	<div class="flex min-h-8 flex-wrap items-center gap-2">
		{#if chosen.length > 0}
			<span class="mr-2 text-sm">{m.selected({ count: chosen.length })}</span>
			{#if library.writable}
				<Button variant="outline" size="sm" onclick={() => actions.move(chosen)}>{m.move()}</Button>
			{/if}
			<Button variant="outline" size="sm" onclick={() => actions.copy(chosen)}>{m.copy()}</Button>
			{#if library.writable}
				<Button variant="outline" size="sm" onclick={() => actions.remove(chosen)}
					>{m.delete()}</Button
				>
			{/if}
		{:else if library.writable}
			<!-- Labels opening their file input: native, keyboard included (the input stays focusable). -->
			<label class={[buttonVariants({ size: 'sm' }), 'cursor-pointer focus-within:ring-3']}>
				<UploadIcon />
				{m.upload()}
				<input type="file" multiple class="sr-only" onchange={(e) => picked(e.currentTarget)} />
			</label>
			<label
				class={[
					buttonVariants({ variant: 'outline', size: 'sm' }),
					'cursor-pointer focus-within:ring-3'
				]}
			>
				<FolderUpIcon />
				{m.upload_folder()}
				<input
					type="file"
					webkitdirectory
					class="sr-only"
					onchange={(e) => picked(e.currentTarget)}
				/>
			</label>
			<Button variant="outline" size="sm" onclick={() => newFolder.show()}>
				<FolderPlusIcon />
				{m.new_folder()}
			</Button>
		{/if}
	</div>

	{#if children.length === 0}
		<p class="text-muted-foreground">{folder.parent ? m.folder_empty() : m.library_empty()}</p>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-8">
						<Checkbox
							checked={everything}
							indeterminate={chosen.length > 0 && !everything}
							onCheckedChange={(on) => (selected = on ? children.map((c) => c.id) : [])}
							aria-label={m.select_all()}
						/>
					</Table.Head>
					<Table.Head aria-sort={ariaSort('name')}>{@render sortable('name', m.name())}</Table.Head>
					<Table.Head class="w-28 text-right" aria-sort={ariaSort('size')}>
						{@render sortable('size', m.size())}
					</Table.Head>
					<Table.Head class="w-48" aria-sort={ariaSort('modified')}>
						{@render sortable('modified', m.modified())}
					</Table.Head>
					<Table.Head class="w-10"><span class="sr-only">{m.actions()}</span></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows as node (node.id)}
					<Table.Row data-state={selected.includes(node.id) ? 'selected' : undefined}>
						<Table.Cell>
							<Checkbox
								checked={selected.includes(node.id)}
								onCheckedChange={(on) =>
									(selected = on
										? [...selected, node.id]
										: selected.filter((id) => id !== node.id))}
								aria-label={m.select_item({ name: node.name })}
							/>
						</Table.Cell>
						<Table.Cell>
							<a
								href="{base}/{node.id}"
								class="flex items-center gap-2 font-medium hover:underline"
							>
								{#if node.is_file}
									<FileIcon class="size-4 text-muted-foreground" />
								{:else}
									<FolderIcon class="size-4 text-primary" />
								{/if}
								{node.name}
							</a>
						</Table.Cell>
						<Table.Cell class="text-right text-muted-foreground tabular-nums">
							{node.size != null ? formatSize(node.size) : ''}
						</Table.Cell>
						<Table.Cell class="text-muted-foreground">
							{node.modified ? formatDate(node.modified) : ''}
						</Table.Cell>
						<Table.Cell>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="ghost"
											size="icon-sm"
											aria-label={m.item_menu({ name: node.name })}
										>
											<EllipsisIcon />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									{#if node.is_file}
										<DropdownMenu.Item onSelect={() => download(node)}
											>{m.download()}</DropdownMenu.Item
										>
									{/if}
									{#if library.writable}
										<DropdownMenu.Item onSelect={() => actions.rename(node)}>
											{m.rename()}
										</DropdownMenu.Item>
										<DropdownMenu.Item onSelect={() => actions.move([node])}>
											{m.move()}
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Item onSelect={() => actions.copy([node])}>
										{m.copy()}
									</DropdownMenu.Item>
									{#if library.writable}
										<DropdownMenu.Item onSelect={() => actions.remove([node])}
											>{m.delete()}</DropdownMenu.Item
										>
									{/if}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<NameDialog
	bind:this={newFolder}
	title={m.new_folder()}
	action={m.create()}
	submit={createFolder}
/>
<NodeActions bind:this={actions} {library} {trail} {destinations} changed={refresh} />
