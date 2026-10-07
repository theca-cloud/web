<script lang="ts">
	import { onMount } from 'svelte';
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

	let error = $state<string>();
	let notice = $state<string>();
	let email = $state('');

	// The link confirms at once, and logs in.
	onMount(async () => {
		const token = page.url.searchParams.get('token') ?? '';
		const result = await call(api.POST('/api/v1/auth/verify', { body: { token } }));
		if (result.ok) {
			await goto('/', { invalidateAll: true });
		} else {
			error = explain(result.error);
		}
	});

	async function resend(event: SubmitEvent) {
		event.preventDefault();
		const result = await call(api.POST('/api/v1/auth/verify/resend', { body: { email } }));
		notice = result.ok ? m.login_resent() : explain(result.error);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.verify_title()}</Card.Title>
	</Card.Header>
	<Card.Content class="grid gap-4">
		{#if error}
			<Alert.Root variant="destructive">
				<Alert.Description>{error}</Alert.Description>
			</Alert.Root>
			{#if notice}
				<Alert.Root>
					<Alert.Description>{notice}</Alert.Description>
				</Alert.Root>
			{:else}
				<form class="grid gap-4" onsubmit={resend}>
					<div class="grid gap-2">
						<Label for="email">{m.email()}</Label>
						<Input id="email" type="email" autocomplete="username" required bind:value={email} />
					</div>
					<Button type="submit">{m.verify_resend_submit()}</Button>
				</form>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
