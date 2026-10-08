<script lang="ts">
	// Asks before something heavy (a library to the trash, a delete for good):
	// `ask(...)` answers whether it was confirmed.
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { m } from '#lib/paraglide/messages.js';

	let open = $state(false);
	let title = $state('');
	let text = $state('');
	let action = $state('');
	let answer: (confirmed: boolean) => void = () => {};

	export function ask(question: { title: string; text: string; action: string }): Promise<boolean> {
		({ title, text, action } = question);
		open = true;
		return new Promise((resolve) => (answer = resolve));
	}

	function reply(confirmed: boolean) {
		open = false;
		answer(confirmed);
	}
</script>

<Dialog.Root bind:open onOpenChange={(now) => !now && answer(false)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{text}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => reply(false)}>{m.cancel()}</Button>
			<Button variant="destructive" onclick={() => reply(true)}>{action}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
