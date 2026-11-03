<script lang="ts">
	import { page } from '$app/state';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { api, call, type ApiError } from '#lib/api.js';
	import { explain } from '#lib/errors.js';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	let busy = $state(false);
	let connected = $state(false);
	// The load's error at first, then the approval's.
	let failure = $state<ApiError | null>(null);
	const error = $derived(failure ?? data.error);

	function say(error: ApiError) {
		if (error.code === 'not_found') return m.connect_expired();
		if (error.code === 'full_session_required') return m.connect_full_session_required();
		return explain(error);
	}

	// Cancelling just leaves: the flow expires by itself.
	async function allow() {
		busy = true;
		const result = await call(
			api.POST('/api/v1/auth/flows/{id}/approve', { params: { path: { id: page.params.flow! } } })
		);
		busy = false;
		if (result.ok) connected = true;
		else failure = result.error;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{data.flow && !connected && !error
				? m.connect_question({ name: data.flow.name })
				: m.connect_title()}
		</Card.Title>
	</Card.Header>
	<Card.Content class="grid gap-4">
		{#if connected && data.flow}
			<Alert.Root>
				<Alert.Description>{m.connect_done({ name: data.flow.name })}</Alert.Description>
			</Alert.Root>
		{:else if error || !data.flow}
			<Alert.Root variant="destructive">
				<Alert.Description>{error ? say(error) : m.connect_expired()}</Alert.Description>
			</Alert.Root>
		{:else}
			<p
				class="rounded-md bg-muted py-4 text-center font-mono text-3xl font-semibold tracking-widest"
			>
				{data.flow.code}
			</p>
			<p class="text-sm text-muted-foreground">{m.connect_check_code()}</p>
			<div class="flex justify-end gap-2">
				<Button variant="outline" href="/">{m.cancel()}</Button>
				<Button onclick={allow} disabled={busy}>{m.connect_allow()}</Button>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
