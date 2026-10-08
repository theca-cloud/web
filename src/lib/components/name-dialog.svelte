<script lang="ts">
	// Asks for a name (a new library or folder, a rename): opened with
	// `show(initial)`. `submit` answers an error message to show, or nothing
	// once done; the dialog then closes.
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { m } from '#lib/paraglide/messages.js';

	let {
		title,
		action,
		submit
	}: {
		title: string;
		action: string;
		submit: (name: string) => Promise<string | undefined>;
	} = $props();

	// Unique per dialog: a page has several.
	const id = $props.id();

	let open = $state(false);
	let name = $state('');
	let busy = $state(false);
	let error = $state<string>();

	export function show(initial = '') {
		name = initial;
		error = undefined;
		open = true;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = await submit(name.trim());
		busy = false;
		if (!error) {
			open = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<form class="grid gap-4" {onsubmit}>
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
			</Dialog.Header>
			<div class="grid gap-2">
				<Label for="{id}-name">{m.name()}</Label>
				<Input id="{id}-name" required autocomplete="off" bind:value={name} />
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
				<Button type="submit" disabled={busy}>{action}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
