<script lang="ts">
	// A file's page: its actions (those of its row in the folder), its preview,
	// its versions (newest first; any one previewed, downloaded, made current).
	import { goto, invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileIcon from '@lucide/svelte/icons/file';
	import FilePreview from '#lib/components/file-preview.svelte';
	import NodeActions from '#lib/components/node-actions.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import { api, call } from '#lib/api.js';
	import { download } from '#lib/download.js';
	import { explain } from '#lib/errors.js';
	import { formatDate, formatSize } from '#lib/format.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Library = components['schemas']['Library'];
	type NodeInfo = components['schemas']['NodeInfo'];
	type Version = components['schemas']['Version'];

	let {
		library,
		file,
		versions,
		destinations
	}: { library: Library; file: NodeInfo; versions: Version[]; destinations: Library[] } = $props();

	let actions: NodeActions;
	// The version previewed: the current one until another is picked.
	let shown = $state<Version>();
	const previewed = $derived(shown ?? versions.find((v) => v.current) ?? versions[0]);

	const item = $derived({ id: file.id, name: file.name, is_file: true });
	const trail = $derived((file.ancestors ?? []).filter((a) => a.name !== ''));
	const base = $derived(`/${library.organization}/${library.id}`);

	async function changed(kind: string) {
		if (kind === 'delete') {
			// Its folder: where it was.
			await goto(file.parent && file.parent !== library.root ? `${base}/${file.parent}` : base);
			return;
		}
		if (kind === 'move') {
			// Maybe to another library: wherever it is now.
			const params = { path: { id: file.id } };
			const now = await call(api.GET('/api/v1/nodes/{id}', { params }));
			if (now.ok && now.data.library !== library.id) {
				await goto(`/${library.organization}/${now.data.library}/${file.id}`, {
					invalidateAll: true
				});
				return;
			}
		}
		await invalidate('app:folder');
	}

	async function makeCurrent(version: Version) {
		const params = { path: { id: file.id, version: version.id } };
		const result = await call(
			api.POST('/api/v1/files/{id}/versions/{version}/restore', { params })
		);
		if (result.ok) {
			toast(m.version_restored({ number: version.number ?? '' }));
			shown = undefined;
			await invalidate('app:folder');
		} else {
			toast.error(explain(result.error));
		}
	}
</script>

<div class="grid gap-6 p-6">
	<div class="grid gap-2">
		<h1 class="flex items-center gap-2 text-lg font-medium">
			<FileIcon class="size-5 text-muted-foreground" />
			{file.name}
		</h1>
		<p class="text-sm text-muted-foreground">
			{formatSize(file.size ?? 0)}
			{#if previewed}· {m.file_modified({ date: formatDate(previewed.created_at) })}{/if}
		</p>
		<div class="flex flex-wrap gap-2">
			<Button size="sm" onclick={() => download(file)}>
				<DownloadIcon />
				{m.download()}
			</Button>
			{#if library.writable}
				<Button size="sm" variant="outline" onclick={() => actions.rename(item)}
					>{m.rename()}</Button
				>
				<Button size="sm" variant="outline" onclick={() => actions.move([item])}>{m.move()}</Button>
			{/if}
			<Button size="sm" variant="outline" onclick={() => actions.copy([item])}>{m.copy()}</Button>
			{#if library.writable}
				<Button size="sm" variant="outline" onclick={() => actions.remove([item])}
					>{m.delete()}</Button
				>
			{/if}
		</div>
	</div>

	{#if previewed}
		<section class="grid gap-2" aria-label={m.preview()}>
			{#key `${file.id}/${previewed.id}`}
				<FilePreview
					file={file.id}
					version={previewed.id}
					name={file.name}
					size={previewed.size ?? 0}
				/>
			{/key}
		</section>
	{/if}

	<section class="grid gap-2">
		<h2 class="font-medium">{m.versions()}</h2>
		<Table.Root>
			<Table.Body>
				{#each versions as version (version.id)}
					<Table.Row data-state={version.id === previewed?.id ? 'selected' : undefined}>
						<Table.Cell class="w-24 font-medium tabular-nums">
							{version.number}
							{#if version.current}
								<span class="ml-1 rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
									{m.version_current()}
								</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-muted-foreground">
							{formatDate(version.created_at)}
							{#if version.author}· {m.version_by({ author: version.author })}{/if}
						</Table.Cell>
						<Table.Cell class="text-muted-foreground">{version.message ?? ''}</Table.Cell>
						<Table.Cell class="w-28 text-right text-muted-foreground tabular-nums">
							{formatSize(version.size ?? 0)}
						</Table.Cell>
						<Table.Cell class="w-72 text-right">
							<Button
								variant="ghost"
								size="sm"
								aria-label="{m.preview()} {m.version_number({ number: version.number ?? '' })}"
								onclick={() => (shown = version)}
							>
								{m.preview()}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								aria-label="{m.download()} {m.version_number({ number: version.number ?? '' })}"
								onclick={() =>
									download({ ...file, current_version: version.id, size: version.size })}
							>
								{m.download()}
							</Button>
							{#if library.writable && !version.current}
								<Button
									variant="ghost"
									size="sm"
									aria-label="{m.version_restore()} {m.version_number({
										number: version.number ?? ''
									})}"
									onclick={() => makeCurrent(version)}
								>
									{m.version_restore()}
								</Button>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</section>
</div>

<NodeActions bind:this={actions} {library} {trail} {destinations} {changed} />
