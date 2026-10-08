<script lang="ts">
	// A dialog holding a form (its fields as children): opened with `show()`.
	// `submit` answers an error message to show, or nothing once done; the
	// dialog then closes.
	import type { Snippet } from 'svelte';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { m } from '#lib/paraglide/messages.js';

	let {
		title,
		text,
		action,
		destructive = false,
		submit,
		children
	}: {
		title: string;
		text?: string;
		action: string;
		destructive?: boolean;
		submit: () => Promise<string | undefined>;
		children: Snippet;
	} = $props();

	let open = $state(false);
	let busy = $state(false);
	let error = $state<string>();

	export function show() {
		error = undefined;
		open = true;
	}

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = await submit();
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
				{#if text}
					<Dialog.Description>{text}</Dialog.Description>
				{/if}
			</Dialog.Header>
			{@render children()}
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
				<Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={busy}>
					{action}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
