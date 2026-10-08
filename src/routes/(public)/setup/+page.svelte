<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import NewPassword from '#lib/components/new-password.svelte';
	import StorageFields from '#lib/components/storage-fields.svelte';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let organization = $state('');
	let storage: StorageFields;
	let busy = $state(false);
	let error = $state<string>();

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = undefined;
		const body = {
			admin_email: email,
			admin_password: password,
			organization,
			storages: [storage.value()]
		};
		// The token the server printed in its logs (none when its setup is open).
		const headers = { 'X-Theca-Setup-Token': page.url.searchParams.get('token') ?? '' };
		const result = await call(api.POST('/api/v1/setup', { body, headers }));
		busy = false;
		if (result.ok) {
			await goto('/', { invalidateAll: true });
		} else {
			error = explain(result.error);
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.setup_title()}</Card.Title>
		<Card.Description>{m.setup_text()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form class="grid gap-6" onsubmit={submit}>
			<fieldset class="grid gap-4">
				<legend class="mb-2 font-medium">{m.setup_admin()}</legend>
				<div class="grid gap-2">
					<Label for="email">{m.email()}</Label>
					<Input id="email" type="email" autocomplete="username" required bind:value={email} />
				</div>
				<NewPassword
					bind:value={password}
					{email}
					level={data.instance.password_strength}
					label={m.password()}
				/>
			</fieldset>
			<fieldset class="grid gap-2">
				<legend class="mb-2 font-medium">{m.setup_organization()}</legend>
				<Label for="organization">{m.setup_organization_hint()}</Label>
				<Input id="organization" required bind:value={organization} />
			</fieldset>
			<fieldset class="grid gap-4">
				<legend class="mb-2 font-medium">{m.setup_storage()}</legend>
				<StorageFields bind:this={storage} />
			</fieldset>
			{#if error}
				<Alert.Root variant="destructive">
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}
			<Button type="submit" disabled={busy}>{m.setup_submit()}</Button>
		</form>
	</Card.Content>
</Card.Root>
