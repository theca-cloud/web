<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain, explainCode } from '#lib/errors.js';
	import { safeNext } from '#lib/next.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	// Asked once the server answers `totp_required`; the same login is sent again with it.
	let totp = $state('');
	let askTotp = $state(false);
	let busy = $state(false);
	let error = $state<string>();
	let unverified = $state(false);
	let notice = $state<string>();
	// A failed OIDC login comes back here with its code.
	const oidcError = $derived(page.url.searchParams.get('error'));

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = notice = undefined;
		const body = { email, password, totp: askTotp ? totp : undefined };
		const result = await call(api.POST('/api/v1/auth/login', { body }));
		busy = false;
		if (result.ok) {
			await goto(safeNext(page.url.searchParams.get('next')), { invalidateAll: true });
		} else if (result.error.code === 'totp_required') {
			askTotp = true;
		} else {
			unverified = result.error.code === 'email_not_verified';
			error = explain(result.error);
		}
	}

	async function resend() {
		const result = await call(api.POST('/api/v1/auth/verify/resend', { body: { email } }));
		unverified = false;
		error = undefined;
		notice = result.ok ? m.login_resent() : explain(result.error);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.login_title()}</Card.Title>
	</Card.Header>
	<Card.Content class="grid gap-4">
		{#if oidcError}
			<Alert.Root variant="destructive">
				<Alert.Description>{explainCode(oidcError)}</Alert.Description>
			</Alert.Root>
		{/if}
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
					autocomplete="current-password"
					required
					bind:value={password}
				/>
			</div>
			{#if askTotp}
				<div class="grid gap-2">
					<Label for="totp">{m.totp_code()}</Label>
					<Input
						id="totp"
						autocomplete="one-time-code"
						required
						autofocus
						aria-describedby="totp-hint"
						bind:value={totp}
					/>
					<p id="totp-hint" class="text-sm text-muted-foreground">{m.totp_hint()}</p>
				</div>
			{/if}
			{#if error}
				<Alert.Root variant="destructive">
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
				{#if unverified}
					<Button variant="link" onclick={resend}>{m.login_resend()}</Button>
				{/if}
			{/if}
			{#if notice}
				<Alert.Root>
					<Alert.Description>{notice}</Alert.Description>
				</Alert.Root>
			{/if}
			<Button type="submit" disabled={busy}>{m.login_submit()}</Button>
		</form>
		{#if data.providers.length > 0}
			<p class="text-center text-sm text-muted-foreground">{m.login_or()}</p>
			{#each data.providers as provider (provider.id)}
				<!-- A full navigation: the server redirects to the provider. -->
				<Button
					variant="outline"
					href="/api/v1/auth/oidc/{provider.id}/start"
					data-sveltekit-reload
				>
					{m.login_with({ provider: provider.name })}
				</Button>
			{/each}
		{/if}
	</Card.Content>
	<Card.Footer class="flex justify-between text-sm">
		<a href="/reset" class="underline-offset-4 hover:underline">{m.login_forgot()}</a>
		{#if data.instance.registration}
			<a href="/register" class="underline-offset-4 hover:underline">{m.login_register()}</a>
		{/if}
	</Card.Footer>
</Card.Root>
