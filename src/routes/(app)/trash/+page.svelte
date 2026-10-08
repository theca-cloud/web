<script lang="ts">
	// The trash of the scope: restore, or delete for good (confirmed: it can't
	// be undone), several at once; trashed libraries too; emptying it all.
	import { goto, invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import FileIcon from '@lucide/svelte/icons/file';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import ScopeSelect from '#lib/components/scope-select.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { formatDate, formatSize } from '#lib/format.js';
	import * as nodes from '#lib/nodes.js';
	import { m } from '#lib/paraglide/messages.js';
	import { scopeQuery, type Scope } from '#lib/scope.js';

	let { data } = $props();

	type Entry = (typeof data.groups)[number]['entries'][number];
	type TrashedLibrary = (typeof data.trashedLibraries)[number];

	let confirm: ConfirmDialog;
	let selected = $state<string[]>([]);
	const entries = $derived(data.groups.flatMap((g) => g.entries));
	const chosen = $derived(entries.filter((e) => selected.includes(e.id)));
	const empty = $derived(entries.length === 0 && data.trashedLibraries.length === 0);

	function widen(scope: Scope) {
		goto(`/trash?${new URLSearchParams(scopeQuery(scope))}`);
	}

	async function refresh() {
		selected = [];
		await Promise.all([invalidate('app:trash'), invalidate('app:libraries')]);
	}

	function report(failed: nodes.Split<Entry>['failed']) {
		if (failed.length === 1) {
			toast.error(`${failed[0].item.name}: ${explain(failed[0].error)}`);
		} else if (failed.length > 1) {
			const names = failed.map((f) => f.item.name).join(', ');
			toast.error(m.failed_items({ count: failed.length, names }));
		}
	}

	async function restore(items: Entry[]) {
		const { done, failed } = nodes.split(items, await nodes.restore(items.map((e) => e.id)));
		if (done.length > 0) toast(m.restored_count({ count: done.length }));
		report(failed);
		await refresh();
	}

	async function deleteForever(items: Entry[], libraries: TrashedLibrary[] = []) {
		const count = items.length + libraries.length;
		const confirmed = await confirm.ask({
			title: m.delete_forever_title(),
			text:
				count === 1
					? m.delete_forever_one({ name: (items[0] ?? libraries[0]).name })
					: m.delete_forever_text({ count }),
			action: m.delete_forever()
		});
		if (!confirmed) return;
		if (items.length > 0) {
			const { failed } = nodes.split(
				items,
				await nodes.trash(
					items.map((e) => e.id),
					true
				)
			);
			report(failed);
		}
		for (const library of libraries) {
			const params = { path: { id: library.id }, query: { permanent: true } };
			const result = await call(api.DELETE('/api/v1/libraries/{id}', { params }));
			if (!result.ok) toast.error(`${library.name}: ${explain(result.error)}`);
		}
		toast(m.deleted_forever());
		await refresh();
	}

	async function restoreLibrary(library: TrashedLibrary) {
		const params = { path: { id: library.id } };
		const result = await call(api.POST('/api/v1/libraries/{id}/restore', { params }));
		if (result.ok) toast(m.restored());
		else toast.error(explain(result.error));
		await refresh();
	}

	async function emptyTrash() {
		const confirmed = await confirm.ask({
			title: m.delete_forever_title(),
			text: m.empty_trash_text(),
			action: m.empty_trash()
		});
		if (!confirmed) return;
		if (entries.length > 0) {
			report(
				nodes.split(
					entries,
					await nodes.trash(
						entries.map((e) => e.id),
						true
					)
				).failed
			);
		}
		for (const library of data.trashedLibraries) {
			const params = { path: { id: library.id }, query: { permanent: true } };
			const result = await call(api.DELETE('/api/v1/libraries/{id}', { params }));
			if (!result.ok) toast.error(`${library.name}: ${explain(result.error)}`);
		}
		await refresh();
	}

	/** Where an entry was: its path's folder. */
	const folderOf = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';
</script>

<div class="grid gap-4 p-4">
	<div class="flex flex-wrap items-end gap-2">
		<ScopeSelect options={data.options} scope={data.scope} pick={widen} />
		{#if chosen.length > 0}
			<span class="ml-2 text-sm">{m.selected({ count: chosen.length })}</span>
			<Button variant="outline" size="sm" onclick={() => restore(chosen)}>{m.restore()}</Button>
			<Button variant="outline" size="sm" onclick={() => deleteForever(chosen)}>
				{m.delete_forever()}
			</Button>
		{:else if !empty}
			<Button variant="outline" size="sm" onclick={emptyTrash}>{m.empty_trash()}</Button>
		{/if}
	</div>

	{#if empty}
		<p class="text-muted-foreground">{m.trash_empty()}</p>
	{/if}

	{#if data.trashedLibraries.length > 0}
		<section class="grid gap-2">
			<h2 class="font-medium">{m.trash_libraries()}</h2>
			<Table.Root>
				<Table.Body>
					{#each data.trashedLibraries as library (library.id)}
						<Table.Row>
							<Table.Cell>
								<span class="flex items-center gap-2 font-medium">
									<LibraryIcon class="size-4 text-muted-foreground" />
									{library.name}
								</span>
							</Table.Cell>
							<Table.Cell class="w-48 text-muted-foreground"
								>{formatDate(library.deleted_at)}</Table.Cell
							>
							<Table.Cell class="w-64 text-right">
								<Button variant="ghost" size="sm" onclick={() => restoreLibrary(library)}>
									{m.restore()}
								</Button>
								<Button variant="ghost" size="sm" onclick={() => deleteForever([], [library])}>
									{m.delete_forever()}
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</section>
	{/if}

	{#each data.groups as group (group.library.id)}
		<section class="grid gap-2">
			<h2 class="font-medium">{group.library.name}</h2>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-8"></Table.Head>
						<Table.Head>{m.name()}</Table.Head>
						<Table.Head>{m.where()}</Table.Head>
						<Table.Head class="w-48">{m.deleted()}</Table.Head>
						<Table.Head class="w-28 text-right">{m.size()}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each group.entries as entry (entry.id)}
						<Table.Row data-state={selected.includes(entry.id) ? 'selected' : undefined}>
							<Table.Cell>
								<Checkbox
									checked={selected.includes(entry.id)}
									onCheckedChange={(on) =>
										(selected = on
											? [...selected, entry.id]
											: selected.filter((id) => id !== entry.id))}
									aria-label={m.select_item({ name: entry.name })}
								/>
							</Table.Cell>
							<Table.Cell>
								<span class="flex items-center gap-2 font-medium">
									{#if entry.is_file}
										<FileIcon class="size-4 text-muted-foreground" />
									{:else}
										<FolderIcon class="size-4 text-primary" />
									{/if}
									{entry.name}
								</span>
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">{folderOf(entry.path)}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{formatDate(entry.deleted_at)}</Table.Cell>
							<Table.Cell class="text-right text-muted-foreground tabular-nums">
								{entry.size != null ? formatSize(entry.size) : ''}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</section>
	{/each}
</div>

<ConfirmDialog bind:this={confirm} />
