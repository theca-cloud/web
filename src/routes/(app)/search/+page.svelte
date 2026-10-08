<script lang="ts">
	import { goto } from '$app/navigation';
	import FileIcon from '@lucide/svelte/icons/file';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import ScopeSelect from '#lib/components/scope-select.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { formatSize } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { scopeQuery, type Scope } from '#lib/scope.js';

	let { data } = $props();

	// The field starts with the URL's query; searching again changes the URL.
	// svelte-ignore state_referenced_locally
	let query = $state(data.q);

	function go(q: string, scope: Scope) {
		goto(`/search?${new URLSearchParams({ q, ...scopeQuery(scope) })}`);
	}

	function where(result: { library: string; path: string }) {
		const library = data.libraries.find((l) => l.id === result.library);
		const folder = result.path.slice(0, result.path.lastIndexOf('/')) || '/';
		return { library, folder };
	}
</script>

<div class="grid gap-4 p-4">
	<form
		role="search"
		class="flex flex-wrap items-end gap-2"
		onsubmit={(event) => {
			event.preventDefault();
			go(query.trim(), data.scope);
		}}
	>
		<label class="grid gap-1 text-sm">
			{m.search()}
			<Input class="w-72" placeholder={m.search_placeholder()} bind:value={query} />
		</label>
		<ScopeSelect
			options={data.options}
			scope={data.scope}
			pick={(scope) => go(query.trim(), scope)}
		/>
		<Button type="submit">{m.search()}</Button>
	</form>

	{#if data.q.length < 3}
		<p class="text-sm text-muted-foreground">{m.search_hint()}</p>
	{:else if data.problem}
		<p class="text-sm text-destructive">{data.problem}</p>
	{:else if data.results.length === 0}
		<p class="text-muted-foreground">{m.search_none()}</p>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>{m.name()}</Table.Head>
					<Table.Head>{m.library()}</Table.Head>
					<Table.Head>{m.where()}</Table.Head>
					<Table.Head class="w-28 text-right">{m.size()}</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.results as result (result.id)}
					{@const at = where(result)}
					<Table.Row>
						<Table.Cell>
							<a
								href="/{at.library?.organization}/{result.library}/{result.id}"
								class="flex items-center gap-2 font-medium hover:underline"
							>
								{#if result.is_file}
									<FileIcon class="size-4 text-muted-foreground" />
								{:else}
									<FolderIcon class="size-4 text-primary" />
								{/if}
								{result.name}
							</a>
						</Table.Cell>
						<Table.Cell class="text-muted-foreground">{at.library?.name}</Table.Cell>
						<Table.Cell class="text-muted-foreground">{at.folder}</Table.Cell>
						<Table.Cell class="text-right text-muted-foreground tabular-nums">
							{result.size != null ? formatSize(result.size) : ''}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
