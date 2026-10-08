<script lang="ts">
	import FileView from '#lib/components/file-view.svelte';
	import FolderView from '#lib/components/folder-view.svelte';

	let { data } = $props();

	// Where moves and copies may go: the organization's libraries the account writes in.
	const destinations = $derived(
		data.libraries.filter((l) => l.organization === data.library.organization && l.writable)
	);
</script>

{#if data.node.is_file}
	{#key data.node.id}
		<FileView library={data.library} file={data.node} versions={data.versions} {destinations} />
	{/key}
{:else}
	<FolderView library={data.library} folder={data.node} children={data.children} {destinations} />
{/if}
