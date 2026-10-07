<script lang="ts">
	import { page } from '$app/state';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	// With a link's token: the new password; without: asking for a link.
	const token = $derived(page.url.searchParams.get('token'));

	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state<string>();
	let done = $state<string>();

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = undefined;
		const result = token
			? await call(api.POST('/api/v1/auth/password/reset', { body: { token, password } }))
			: await call(api.POST('/api/v1/auth/password/forgot', { body: { email } }));
		busy = false;
		if (result.ok) {
			done = token ? m.reset_done() : m.reset_sent();
		} else {
			error = explain(result.error);
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.reset_title()}</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if done}
			<Alert.Root>
				<Alert.Description>{done}</Alert.Description>
			</Alert.Root>
		{:else}
			<form class="grid gap-4" onsubmit={submit}>
				{#if token}
					<div class="grid gap-2">
						<Label for="password">{m.new_password()}</Label>
						<Input
							id="password"
							type="password"
							autocomplete="new-password"
							required
							bind:value={password}
						/>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">{m.reset_ask()}</p>
					<div class="grid gap-2">
						<Label for="email">{m.email()}</Label>
						<Input id="email" type="email" autocomplete="username" required bind:value={email} />
					</div>
				{/if}
				{#if error}
					<Alert.Root variant="destructive">
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}
				<Button type="submit" disabled={busy}>
					{token ? m.reset_submit() : m.reset_ask_submit()}
				</Button>
			</form>
		{/if}
	</Card.Content>
	<Card.Footer class="text-sm">
		<a href="/login" class="underline-offset-4 hover:underline">{m.back_to_login()}</a>
	</Card.Footer>
</Card.Root>
