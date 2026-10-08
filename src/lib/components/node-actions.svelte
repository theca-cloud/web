<script lang="ts">
	// What can be done to files and folders, with its dialogs: rename, move,
	// copy (asked before replacing files), delete with an undo. Used by the
	// folder table (its rows, its selection) and a file's page. Each change is
	// one request whatever the count, each item its own outcome: failures in
	// one toast, the others done, then `changed` (to reload what shows them).
	import { toast } from 'svelte-sonner';
	import DestinationDialog from '#lib/components/destination-dialog.svelte';
	import NameDialog from '#lib/components/name-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { explain } from '#lib/errors.js';
	import * as nodes from '#lib/nodes.js';
	import type { Split } from '#lib/nodes.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';

	type Library = components['schemas']['Library'];
	type Item = { id: string; name: string; is_file: boolean };
	type Folder = { id: string; name: string };

	let {
		library,
		trail,
		destinations,
		changed
	}: {
		library: Library;
		/** Where the items are (the folders below the root), for the destination dialog to start there. */
		trail: Folder[];
		/** The organization's libraries a move or copy may go to. */
		destinations: Library[];
		changed: (
			kind: 'rename' | 'move' | 'copy' | 'delete' | 'restore',
			done: Item[]
		) => Promise<void>;
	} = $props();

	let renaming: NameDialog;
	let renamed = $state<Item>();
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

	function report(failed: Split<Item>['failed']) {
		if (failed.length === 1) {
			toast.error(`${failed[0].item.name}: ${explain(failed[0].error)}`);
		} else if (failed.length > 1) {
			const names = failed.map((f) => f.item.name).join(', ');
			toast.error(m.failed_items({ count: failed.length, names }));
		}
	}

	export function rename(item: Item) {
		renamed = item;
		renaming.show(item.name);
	}

	async function renameTo(name: string) {
		const item = renamed!;
		const { failed } = nodes.split([item], await nodes.update([{ id: item.id, name }]));
		if (failed.length > 0) return explain(failed[0].error);
		await changed('rename', [item]);
	}

	function title(kind: 'move' | 'copy', items: Item[]) {
		if (items.length === 1) {
			const name = items[0].name;
			return kind === 'move' ? m.move_one({ name }) : m.copy_one({ name });
		}
		const count = items.length;
		return kind === 'move' ? m.move_title({ count }) : m.copy_title({ count });
	}

	export function move(items: Item[]) {
		pick('move', items);
	}

	export function copy(items: Item[]) {
		pick('copy', items);
	}

	function pick(kind: 'move' | 'copy', items: Item[]) {
		destination.show({
			title: title(kind, items),
			action: kind === 'move' ? m.move_here() : m.copy_here(),
			library,
			trail,
			pick: (parent) => send(kind, items, parent)
		});
	}

	async function send(kind: 'move' | 'copy', items: Item[], parent: string) {
		const go = (list: Item[], replace: boolean) => {
			const changes = list.map((n) => ({ id: n.id, parent, replace }));
			return kind === 'move' ? nodes.update(changes) : nodes.copy(changes);
		};
		const { done, failed } = nodes.split(items, await go(items, false));
		// Files landing on files: asked once for all of them (folders are never replaced).
		const taken = failed.filter((f) => f.error.code === 'name_taken' && f.item.is_file);
		const others = failed.filter((f) => !taken.includes(f));
		if (taken.length > 0 && (await ask(taken.map((f) => f.item.name)))) {
			const again = taken.map((f) => f.item);
			const replaced = nodes.split(again, await go(again, true));
			done.push(...replaced.done);
			others.push(...replaced.failed);
		}
		report(others);
		await changed(kind, done);
	}

	export async function remove(items: Item[]) {
		const { done, failed } = nodes.split(items, await nodes.trash(items.map((n) => n.id)));
		if (done.length > 0) {
			const what =
				done.length === 1
					? m.trashed_one({ name: done[0].name })
					: m.trashed({ count: done.length });
			toast(what, { action: { label: m.undo(), onClick: () => undo(done) } });
		}
		report(failed);
		await changed('delete', done);
	}

	async function undo(items: Item[]) {
		const { done, failed } = nodes.split(items, await nodes.restore(items.map((n) => n.id)));
		if (failed.length === 0) toast(m.restored());
		report(failed);
		await changed('restore', done);
	}
</script>

<NameDialog bind:this={renaming} title={m.rename()} action={m.rename()} submit={renameTo} />
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
