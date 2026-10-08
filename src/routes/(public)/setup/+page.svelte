<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import NewPassword from '#lib/components/new-password.svelte';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	let email = $state('');
	let password = $state('');
	let organization = $state('');
	let name = $state('main');
	let kind = $state<'filesystem' | 's3'>('filesystem');
	let path = $state('');
	let host = $state('');
	let region = $state('');
	let bucket = $state('');
	let accessKeyFile = $state('');
	let secretKeyFile = $state('');
	let pathStyle = $state(true);
	let busy = $state(false);
	let error = $state<string>();

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = undefined;
		const storage =
			kind === 'filesystem'
				? { name, implementation: 'filesystem' as const, path }
				: {
						name,
						implementation: 's3' as const,
						host,
						region,
						bucket,
						access_key_file: accessKeyFile,
						secret_key_file: secretKeyFile,
						path_style: pathStyle
					};
		const body = {
			admin_email: email,
			admin_password: password,
			organization,
			storages: [storage]
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
				<div class="grid gap-2">
					<Label for="storage-name">{m.setup_storage_name()}</Label>
					<Input id="storage-name" required bind:value={name} />
				</div>
				<div class="flex flex-col gap-2 text-sm">
					<label class="flex items-center gap-2">
						<input type="radio" name="kind" value="filesystem" bind:group={kind} />
						{m.setup_filesystem()}
					</label>
					<label class="flex items-center gap-2">
						<input type="radio" name="kind" value="s3" bind:group={kind} />
						{m.setup_s3()}
					</label>
				</div>
				{#if kind === 'filesystem'}
					<div class="grid gap-2">
						<Label for="path">{m.setup_path()}</Label>
						<Input id="path" required placeholder="/files" bind:value={path} />
					</div>
				{:else}
					<div class="grid gap-2">
						<Label for="host">{m.setup_host()}</Label>
						<Input
							id="host"
							type="url"
							required
							placeholder="https://s3.example.com"
							bind:value={host}
						/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="grid gap-2">
							<Label for="region">{m.setup_region()}</Label>
							<Input id="region" required bind:value={region} />
						</div>
						<div class="grid gap-2">
							<Label for="bucket">{m.setup_bucket()}</Label>
							<Input id="bucket" required bind:value={bucket} />
						</div>
					</div>
					<div class="grid gap-2">
						<Label for="access-key-file">{m.setup_access_key_file()}</Label>
						<Input id="access-key-file" required bind:value={accessKeyFile} />
					</div>
					<div class="grid gap-2">
						<Label for="secret-key-file">{m.setup_secret_key_file()}</Label>
						<Input id="secret-key-file" required bind:value={secretKeyFile} />
					</div>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={pathStyle} />
						{m.setup_path_style()}
					</label>
				{/if}
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
