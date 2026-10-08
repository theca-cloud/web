<script lang="ts">
	// Errors outside the app's frame (its layout itself failing, the public
	// pages): the public pages' card.
	import ErrorMessage from '#lib/components/error-message.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { m } from '#lib/paraglide/messages.js';
</script>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Content>
			<ErrorMessage href="/" back={m.back_home()} />
		</Card.Content>
	</Card.Root>
</main>
