<script lang="ts">
	// Two-factor (TOTP), for an account with a password (it guards password
	// logins): turned on with a QR code and a first code, then its recovery
	// codes, shown once; new codes and turning off, each with a current code.
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { encode } from 'uqr';
	import FormDialog from '#lib/components/form-dialog.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { api, call } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { on }: { on: boolean } = $props();

	let setup = $state<{ secret: string; uri: string }>();
	let code = $state('');
	let codes = $state<string[]>([]);
	let codesOpen = $state(false);
	let enabling: FormDialog;
	let renewing: FormDialog;
	let disabling: FormDialog;

	async function start() {
		const result = await call(api.POST('/api/v1/auth/totp'));
		if (!result.ok) {
			toast.error(explain(result.error));
			return;
		}
		setup = result.data;
		code = '';
		enabling.show();
	}

	// The QR code's dark modules as one SVG path (no markup injected).
	const qr = $derived.by(() => {
		if (!setup) return null;
		const { data, size } = encode(setup.uri);
		const d = data
			.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
			.join('');
		return { d, size };
	});

	function ask(dialog: FormDialog) {
		code = '';
		dialog.show();
	}

	function showCodes(list: string[]) {
		codes = list;
		codesOpen = true;
	}

	async function confirm() {
		const result = await call(api.POST('/api/v1/auth/totp/confirm', { body: { code } }));
		if (!result.ok) return explain(result.error);
		showCodes(result.data.codes);
		await invalidateAll();
	}

	async function renew() {
		const result = await call(api.POST('/api/v1/auth/totp/recovery-codes', { body: { code } }));
		if (!result.ok) return explain(result.error);
		showCodes(result.data.codes);
	}

	async function disable() {
		const result = await call(api.POST('/api/v1/auth/totp/disable', { body: { code } }));
		if (!result.ok) return explain(result.error);
		toast(m.totp_disabled());
		await invalidateAll();
	}

	function download() {
		const url = URL.createObjectURL(new Blob([codes.join('\n') + '\n'], { type: 'text/plain' }));
		const link = Object.assign(document.createElement('a'), {
			href: url,
			download: 'theca-recovery-codes.txt'
		});
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

{#snippet codeField(id: string)}
	<div class="grid gap-2">
		<Label for={id}>{m.totp_code()}</Label>
		<Input {id} inputmode="numeric" autocomplete="one-time-code" required bind:value={code} />
	</div>
{/snippet}

<p class="text-sm text-muted-foreground">{on ? m.totp_on() : m.totp_off()}</p>
<div class="flex flex-wrap gap-2">
	{#if on}
		<Button size="sm" variant="outline" onclick={() => ask(renewing)}>
			{m.totp_new_codes()}
		</Button>
		<Button size="sm" variant="outline" onclick={() => ask(disabling)}>{m.totp_disable()}</Button>
	{:else}
		<Button size="sm" onclick={start}>{m.totp_enable()}</Button>
	{/if}
</div>

<FormDialog
	bind:this={enabling}
	title={m.totp_enable()}
	text={m.totp_scan()}
	action={m.totp_confirm()}
	submit={confirm}
>
	{#if setup && qr}
		<svg
			viewBox="0 0 {qr.size} {qr.size}"
			class="mx-auto size-48 rounded-lg bg-white p-2"
			role="img"
			aria-label={m.totp_qr()}
			shape-rendering="crispEdges"
		>
			<path d={qr.d} fill="black" />
		</svg>
		<p class="text-sm text-muted-foreground">
			{m.totp_secret()} <code class="font-mono break-all text-foreground">{setup.secret}</code>
		</p>
	{/if}
	{@render codeField('totp-enable')}
</FormDialog>

<FormDialog
	bind:this={renewing}
	title={m.totp_new_codes()}
	text={m.totp_new_codes_text()}
	action={m.totp_new_codes()}
	submit={renew}
>
	{@render codeField('totp-renew')}
</FormDialog>

<FormDialog
	bind:this={disabling}
	title={m.totp_disable()}
	action={m.totp_disable()}
	destructive
	submit={disable}
>
	{@render codeField('totp-disable')}
</FormDialog>

<Dialog.Root bind:open={codesOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m.totp_codes_title()}</Dialog.Title>
			<Dialog.Description>{m.totp_codes_text()}</Dialog.Description>
		</Dialog.Header>
		<ul class="grid grid-cols-2 gap-1 rounded-lg border bg-muted p-3 font-mono text-sm">
			{#each codes as recovery (recovery)}
				<li>{recovery}</li>
			{/each}
		</ul>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => navigator.clipboard.writeText(codes.join('\n'))}>
				{m.copy_to_clipboard()}
			</Button>
			<Button variant="outline" onclick={download}>{m.download()}</Button>
			<Button onclick={() => (codesOpen = false)}>{m.done()}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
