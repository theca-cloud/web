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
	import DestinationDialog from '#lib/components/destination-dialog.svelte';
	import NameDialog from '#lib/components/name-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { formatDate, formatSize } from '#lib/format.js';
	import * as nodes from '#lib/nodes.js';
	import type { Node, Split } from '#lib/nodes.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

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
	let renaming: NameDialog;
	let renamed = $state<Node>();
	let destination: DestinationDialog;

	// Asking before replacing files a move or copy lands on.
	let replaceOpen = $state(false);
	let replaceNames = $state<string[]>([]);
	let answer: (replace: boolean) => void = () => {};

	function ask(names: string[]): Promise<boolean> {
		replaceNames = names;
		replaceOpen = true;
		return new Promise((resolve) => (answer = resolve));
	}

	function reply(replace: boolean) {
		replaceOpen = false;
		answer(replace);
	}

	async function refresh() {
		selected = [];
		await invalidate('app:folder');
	}

	function report(failed: Split<Node>['failed']) {
		if (failed.length === 1) {
			toast.error(`${failed[0].item.name}: ${explain(failed[0].error)}`);
		} else if (failed.length > 1) {
			const names = failed.map((f) => f.item.name).join(', ');
			toast.error(m.failed_items({ count: failed.length, names }));
		}
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

	async function rename(name: string) {
		const node = renamed!;
		const { failed } = nodes.split([node], await nodes.update([{ id: node.id, name }]));
		if (failed.length > 0) return explain(failed[0].error);
		await refresh();
	}

	/** Where the items are, for the destination dialog to start there. */
	function trail() {
		const above = (folder.ancestors ?? []).filter((a) => a.name !== '');
		return folder.parent ? [...above, { id: folder.id, name: folder.name }] : above;
	}

	function title(kind: 'move' | 'copy', items: Node[]) {
		if (items.length === 1) {
			const name = items[0].name;
			return kind === 'move' ? m.move_one({ name }) : m.copy_one({ name });
		}
		const count = items.length;
		return kind === 'move' ? m.move_title({ count }) : m.copy_title({ count });
	}

	function moveOrCopy(kind: 'move' | 'copy', items: Node[]) {
		destination.show({
			title: title(kind, items),
			action: kind === 'move' ? m.move_here() : m.copy_here(),
			library,
			trail: trail(),
			pick: (parent) => send(kind, items, parent)
		});
	}

	async function send(kind: 'move' | 'copy', items: Node[], parent: string) {
		const go = (list: Node[], replace: boolean) => {
			const changes = list.map((n) => ({ id: n.id, parent, replace }));
			return kind === 'move' ? nodes.update(changes) : nodes.copy(changes);
		};
		const { failed } = nodes.split(items, await go(items, false));
		// Files landing on files: asked once for all of them (folders are never replaced).
		const taken = failed.filter((f) => f.error.code === 'name_taken' && f.item.is_file);
		const others = failed.filter((f) => !taken.includes(f));
		if (taken.length > 0 && (await ask(taken.map((f) => f.item.name)))) {
			const again = taken.map((f) => f.item);
			others.push(...nodes.split(again, await go(again, true)).failed);
		}
		report(others);
		await refresh();
	}

	async function remove(items: Node[]) {
		const { done, failed } = nodes.split(items, await nodes.trash(items.map((n) => n.id)));
		if (done.length > 0) {
			const what =
				done.length === 1
					? m.trashed_one({ name: done[0].name })
					: m.trashed({ count: done.length });
			toast(what, {
				action: { label: m.undo(), onClick: () => undo(done) }
			});
		}
		report(failed);
		await refresh();
	}

	async function undo(items: Node[]) {
		const { failed } = nodes.split(items, await nodes.restore(items.map((n) => n.id)));
		if (failed.length === 0) toast(m.restored());
		report(failed);
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

<div class="flex flex-col gap-3 p-4">
	<div class="flex min-h-8 flex-wrap items-center gap-2">
		{#if chosen.length > 0}
			<span class="mr-2 text-sm">{m.selected({ count: chosen.length })}</span>
			{#if library.writable}
				<Button variant="outline" size="sm" onclick={() => moveOrCopy('move', chosen)}
					>{m.move()}</Button
				>
			{/if}
			<Button variant="outline" size="sm" onclick={() => moveOrCopy('copy', chosen)}
				>{m.copy()}</Button
			>
			{#if library.writable}
				<Button variant="outline" size="sm" onclick={() => remove(chosen)}>{m.delete()}</Button>
			{/if}
		{:else if library.writable}
			<Button size="sm" onclick={() => newFolder.show()}>
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
									{#if library.writable}
										<DropdownMenu.Item
											onSelect={() => {
												renamed = node;
												renaming.show(node.name);
											}}
										>
											{m.rename()}
										</DropdownMenu.Item>
										<DropdownMenu.Item onSelect={() => moveOrCopy('move', [node])}>
											{m.move()}
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Item onSelect={() => moveOrCopy('copy', [node])}>
										{m.copy()}
									</DropdownMenu.Item>
									{#if library.writable}
										<DropdownMenu.Item onSelect={() => remove([node])}
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
<NameDialog bind:this={renaming} title={m.rename()} action={m.rename()} submit={rename} />
<DestinationDialog bind:this={destination} libraries={destinations} />

<Dialog.Root bind:open={replaceOpen} onOpenChange={(open) => !open && answer(false)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.replace_title()}</Dialog.Title>
			<Dialog.Description>{m.replace_text({ names: replaceNames.join(', ') })}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => reply(false)}>{m.skip()}</Button>
			<Button onclick={() => reply(true)}>{m.replace()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
