<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let password = $state('');
	let busy = $state(false);
	let error = $state<string>();
	let joined = $state(false);

	// A new account chooses its password and is logged in; an account that
	// could already log in just joins (its own password applies).
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = undefined;
		const token = page.url.searchParams.get('token') ?? '';
		const result = await call(
			api.POST('/api/v1/invitations/accept', { body: { token, password } })
		);
		busy = false;
		if (!result.ok) {
			error = explain(result.error);
		} else if (result.data) {
			await goto('/', { invalidateAll: true });
		} else {
			joined = true;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.invite_title()}</Card.Title>
	</Card.Header>
	<Card.Content>
		{#if joined}
			<Alert.Root>
				<Alert.Description>{m.invite_joined()}</Alert.Description>
			</Alert.Root>
		{:else}
			<form class="grid gap-4" onsubmit={submit}>
				<p class="text-sm text-muted-foreground">{m.invite_text()}</p>
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
				{#if error}
					<Alert.Root variant="destructive">
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}
				<Button type="submit" disabled={busy}>{m.invite_submit()}</Button>
			</form>
		{/if}
	</Card.Content>
	<Card.Footer class="text-sm">
		<a href="/login" class="underline-offset-4 hover:underline">{m.back_to_login()}</a>
	</Card.Footer>
</Card.Root>
