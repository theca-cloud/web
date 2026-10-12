<script lang="ts">
	// A storage's fields (the setup wizard's, the admin's new storage): its
	// name, then a filesystem path or an S3 bucket with its key files.
	// `value()` gives the API's `NewStorage`. `test`: its connection test, on
	// the fields as typed (the page knows which endpoint).
	import ConnectionTest from '#lib/components/connection-test.svelte';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import type { ApiError } from '#lib/api.js';
	import type { components } from '#lib/openapi.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Result } from '#lib/result.js';

	type Backend = components['schemas']['StorageBackend'];
	type Outcome = components['schemas']['ConnectionTest'];

	let {
		name = 'main',
		test
	}: {
		name?: string;
		test?: (backend: Backend) => Promise<Result<Outcome, ApiError>>;
	} = $props();

	// Unique per form: the admin's dialog and a page may both hold one.
	const id = $props.id();

	let storageName = $derived(name);
	let kind = $state<'filesystem' | 's3'>('filesystem');
	let path = $state('');
	let host = $state('');
	let region = $state('');
	let bucket = $state('');
	let accessKeyFile = $state('');
	let secretKeyFile = $state('');
	let pathStyle = $state(true);

	/** The storage itself, without its name (what a test takes). */
	function backend(): Backend {
		return kind === 'filesystem'
			? { implementation: 'filesystem', path }
			: {
					implementation: 's3',
					host,
					region,
					bucket,
					access_key_file: accessKeyFile,
					secret_key_file: secretKeyFile,
					path_style: pathStyle
				};
	}

	export function value(): components['schemas']['NewStorage'] {
		return { name: storageName, ...backend() };
	}
</script>

<div class="grid gap-2">
	<Label for="{id}-name">{m.setup_storage_name()}</Label>
	<Input id="{id}-name" required bind:value={storageName} />
</div>
<div class="flex flex-col gap-2 text-sm">
	<label class="flex items-center gap-2">
		<input type="radio" name="{id}-kind" value="filesystem" bind:group={kind} />
		{m.setup_filesystem()}
	</label>
	<label class="flex items-center gap-2">
		<input type="radio" name="{id}-kind" value="s3" bind:group={kind} />
		{m.setup_s3()}
	</label>
</div>
{#if kind === 'filesystem'}
	<div class="grid gap-2">
		<Label for="{id}-path">{m.setup_path()}</Label>
		<Input id="{id}-path" required placeholder="/files" bind:value={path} />
	</div>
{:else}
	<div class="grid gap-2">
		<Label for="{id}-host">{m.setup_host()}</Label>
		<Input
			id="{id}-host"
			type="url"
			required
			placeholder="https://s3.example.com"
			bind:value={host}
		/>
	</div>
	<div class="grid grid-cols-2 gap-4">
		<div class="grid gap-2">
			<Label for="{id}-region">{m.setup_region()}</Label>
			<Input id="{id}-region" required bind:value={region} />
		</div>
		<div class="grid gap-2">
			<Label for="{id}-bucket">{m.setup_bucket()}</Label>
			<Input id="{id}-bucket" required bind:value={bucket} />
		</div>
	</div>
	<div class="grid gap-2">
		<Label for="{id}-access">{m.setup_access_key_file()}</Label>
		<Input id="{id}-access" required bind:value={accessKeyFile} />
	</div>
	<div class="grid gap-2">
		<Label for="{id}-secret">{m.setup_secret_key_file()}</Label>
		<Input id="{id}-secret" required bind:value={secretKeyFile} />
	</div>
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={pathStyle} />
		{m.setup_path_style()}
	</label>
{/if}
{#if test}
	<ConnectionTest run={() => test(backend())} />
{/if}
