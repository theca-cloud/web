<script lang="ts">
	import FileIcon from '@lucide/svelte/icons/file';
	import FolderView from '#lib/components/folder-view.svelte';
	import { formatSize } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	// Where moves and copies may go: the organization's libraries the account writes in.
	const destinations = $derived(
		data.libraries.filter((l) => l.organization === data.library.organization && l.writable)
	);
</script>

{#if data.node.is_file}
	<div class="grid gap-2 p-6">
		<h1 class="flex items-center gap-2 text-lg font-medium">
			<FileIcon class="size-5 text-muted-foreground" />
			{data.node.name}
		</h1>
		{#if data.node.size != null}
			<p class="text-sm text-muted-foreground">{formatSize(data.node.size)}</p>
		{/if}
		<p class="text-sm text-muted-foreground">{m.file_page_soon()}</p>
	</div>
{:else}
	<FolderView library={data.library} folder={data.node} children={data.children} {destinations} />
{/if}
