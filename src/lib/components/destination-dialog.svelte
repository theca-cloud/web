<script lang="ts">
	// Picks the folder a move or copy goes to: browsing the organization's
	// libraries the account may write in, and their folders. Opened with
	// `show(...)`, starting where the items are.
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Library = components['schemas']['Library'];
	type Folder = { id: string; name: string };

	let { libraries }: { libraries: Library[] } = $props();

	let open = $state(false);
	let title = $state('');
	let action = $state('');
	let pick: (folder: string) => Promise<void> = async () => {};
	// Where the dialog is: a library and the folders below its root, or the
	// list of libraries (no library).
	let library = $state<Library>();
	let trail = $state<Folder[]>([]);
	let folders = $state<Folder[]>([]);
	let error = $state<string>();

	const here = $derived(trail.at(-1)?.id ?? library?.root);

	export function show(options: {
		title: string;
		action: string;
		library: Library;
		trail: Folder[];
		pick: (folder: string) => Promise<void>;
	}) {
		title = options.title;
		action = options.action;
		pick = options.pick;
		open = true;
		enter(
			libraries.find((l) => l.id === options.library.id),
			options.trail
		);
	}

	async function enter(to: Library | undefined, path: Folder[]) {
		library = to;
		trail = path;
		folders = [];
		error = undefined;
		if (!to) return;
		const id = path.at(-1)?.id ?? to.root;
		const children = await call(
			api.GET('/api/v1/nodes/{id}/children', { params: { path: { id } } })
		);
		if (children.ok) {
			folders = children.data.filter((n) => !n.is_file).map((n) => ({ id: n.id, name: n.name }));
		} else {
			error = explain(children.error);
		}
	}

	// Closed first: the operation may ask its own question (replace files?).
	async function confirm() {
		open = false;
		await pick(here!);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				{m.destination()}: {library
					? [library.name, ...trail.map((f) => f.name)].join(' / ')
					: m.libraries()}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid max-h-80 gap-1 overflow-y-auto">
			{#if library}
				<Button
					variant="ghost"
					class="justify-start"
					onclick={() =>
						trail.length > 0 ? enter(library, trail.slice(0, -1)) : enter(undefined, [])}
				>
					<ChevronLeftIcon />
					{trail.at(-2)?.name ?? (trail.length > 0 ? library.name : m.libraries())}
				</Button>
				{#each folders as folder (folder.id)}
					<Button
						variant="ghost"
						class="justify-start"
						onclick={() => enter(library, [...trail, folder])}
					>
						<FolderIcon />
						{folder.name}
					</Button>
				{/each}
			{:else}
				{#each libraries as each (each.id)}
					<Button variant="ghost" class="justify-start" onclick={() => enter(each, [])}>
						<LibraryIcon />
						{each.name}
					</Button>
				{/each}
			{/if}
		</div>
		{#if error}
			<Alert.Root variant="destructive">
				<Alert.Description>{error}</Alert.Description>
			</Alert.Root>
		{/if}
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="outline">{m.cancel()}</Button>
				{/snippet}
			</Dialog.Close>
			<Button disabled={!library} onclick={confirm}>{action}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
