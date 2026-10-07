<script lang="ts">
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state<string>();
	// The same answer whether the address has an account or not.
	let sent = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = undefined;
		const result = await call(api.POST('/api/v1/auth/register', { body: { email, password } }));
		busy = false;
		if (result.ok) {
			sent = true;
		} else {
			error = explain(result.error);
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.register_title()}</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if !data.instance.registration}
			<Alert.Root>
				<Alert.Description>{m.register_closed()}</Alert.Description>
			</Alert.Root>
		{:else if sent}
			<Alert.Root>
				<Alert.Description>{m.register_sent()}</Alert.Description>
			</Alert.Root>
		{:else}
			<form class="grid gap-4" onsubmit={submit}>
				<div class="grid gap-2">
					<Label for="email">{m.email()}</Label>
					<Input id="email" type="email" autocomplete="username" required bind:value={email} />
				</div>
				<div class="grid gap-2">
					<Label for="password">{m.password()}</Label>
					<Input
						id="password"
						type="password"
						autocomplete="new-password"
						required
						bind:value={password}
					/>
				</div>
				{#if error}
					<Alert.Root variant="destructive">
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}
				<Button type="submit" disabled={busy}>{m.register_submit()}</Button>
			</form>
		{/if}
	</Card.Content>
	<Card.Footer class="text-sm">
		<a href="/login" class="underline-offset-4 hover:underline">{m.register_login()}</a>
	</Card.Footer>
</Card.Root>
